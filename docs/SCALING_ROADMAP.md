# RailYatra Scaling Roadmap: from ~100 users to 100,000+ req/s

This document covers the audit, the target architecture, the phased plan with measurable exit
criteria, what has already been shipped in Phase 1 (with load-test evidence), and a set of
differentiating product features.

---

## 1. Audit of the original system

| Area | Finding | Impact |
|---|---|---|
| **Engine concurrency** | One C++ engine process; requests handled strictly one at a time. | Hard ceiling of ~130 route req/s; p99 > 1.2 s at 100 connections. |
| **Reliability** | No `'error'` listener on the spawned engine: a missing or broken binary **crashed the whole server**. Pending requests weren't failed on engine exit (30 s hang). IDs from `Date.now()` could collide. | One bad deploy = total outage. |
| **API correctness** | Unknown `/api/*` paths hung forever when the frontend bundle was present. `sort_by=distance` used per-leg distance, not cumulative, and results were re-sorted by time anyway. | Wrong results, leaked sockets. |
| **Input safety** | `max_switches`/`top_k` passed straight to the engine (huge values → huge allocation → engine crash). Category/PDF params were used to build file paths (encoded `../`). | Trivial DoS; limited file read. |
| **Caching** | None. Category file re-read and re-parsed on every request. Identical route searches recomputed every time. | Wasted CPU on a read-only dataset. |
| **Data layer** | No database: a 16 MB JSON timetable loaded into memory per engine. | Actually a strength for the read path (immutable, in-memory). Weakness: no versioning, no hot reload, no ingestion pipeline. |
| **Observability** | `console.log` only; health endpoint only reported "process spawned". | No SLOs, no capacity signals, no alerting. |
| **Deployment** | Single container, no readiness probe, runs as root, no graceful drain, no horizontal scaling story. | Restarts drop traffic; can't scale out safely. |
| **Testing** | One Windows-only script (`route_engine.exe`), not wired into `npm test`. | No regression safety net. |
| **Frontend** | Live Status page calls a removed `/api/livestatus` endpoint. 5,200-line `fareCalculator.ts` is unused. | Broken feature in the nav, dead weight. |

### Key insight for caching
The engine uses **only the day of week** from the query date (`TimeUtils::getDayFromDate`).
Route results are therefore a pure function of
`(from, to, weekday, max_switches, max_wait, sort_by, top_k)`. Caching by weekday is *exact*
and shrinks the key space ~7× versus caching by date. If date-specific data (cancellations,
special trains, availability) is ever added, the key must include the date again.

---

## 2. Phase 1: Shipped and load-tested (this change)

**Changes**
- **Engine pool** (`backend/src/services/engine.service.js`): N engine processes (default = CPU
  cores, ~55 MB each), least-in-flight dispatch, UUID request IDs, per-worker bounded queue
  (load shedding with 503 instead of unbounded latency), immediate failure of in-flight requests on
  crash, exponential-backoff respawn, spawn-error handling.
- **Caching** (`backend/src/services/cache.js`): LRU + TTL with **request coalescing**
  (concurrent identical misses share one engine call). Applied to route (keyed by weekday),
  schedule, and station autocomplete. Categories are pre-parsed once at startup.
  `Cache-Control` headers make every GET (and the idempotent route POST) CDN-cacheable.
- **Correctness**: cumulative distance cost and distance ordering in the engine; 404 for unknown API
  paths; JSON error handler.
- **Input hardening**: clamped `max_switches` ≤ 5, `top_k` ≤ 50, `max_wait` ≤ 1200; strict
  date/station-code/train-number validation; category whitelist; 10 kB body limit.
- **Engine efficiency**: flat `bestCost` array and right-sized trace buffer per pass. Mean engine
  time per request 5.9 → 5.1 ms, p99 28.6 → 24.7 ms, with output verified identical on 300 queries.
- **Ops**: `/healthz` (liveness), `/readyz` (readiness, gated on engine), `/metrics` (Prometheus:
  request counts/latency histograms per route, cache hit/miss/coalesce, engine timeouts/overload/
  restarts), security headers, keep-alive tuned above LB idle timeout, graceful SIGTERM drain.
- **Deploy**: non-root Docker image with `HEALTHCHECK`; `deploy/docker-compose.yml` +
  `deploy/nginx/nginx.conf` (least-conn LB, micro-cache incl. POST route cache, cache lock,
  stale-on-error, per-IP rate limit, gzip); `deploy/k8s/railyatra.yaml` (Deployment with
  readiness/liveness, zone spreading, HPA 3→200 pods, PDB, zero-downtime rollouts).
  *The nginx and k8s manifests were written but not executed in this environment (no Docker daemon
  available); validate them in staging before relying on them.*
- **Tests**: `cd backend && npm test`: 10 integration tests against the real engine (validation,
  cache equivalence across same-weekday dates, distance ordering, clamping, path traversal, 404s,
  health/metrics).
- **Load harness**: `loadtest/run.js` (autocannon) with `route` and `mixed` scenarios and Zipf
  popularity skew. Raw results in `loadtest/results/`.

**Results** (same 4-vCPU box, 100 connections, 15 s, load generator on the same machine)

| Scenario | Baseline rps | Phase 1 rps | Baseline p99 | Phase 1 p99 |
|---|---|---|---|---|
| Route, uniform popularity (`--zipf 0`) | 130 | **955** (7.3×) | 1,237 ms | **353 ms** |
| Route, realistic skew (`--zipf 1.1`) | 180 | **1,372** (7.6×) | 745 ms | **170 ms** |
| Mixed (60% autocomplete, 25% route, 10% schedule, 5% category) | 185 | **1,867** (10×) | 1,729 ms | **105 ms** |

Zero errors / non-2xx across all runs. Route cache hit rate during the tests: 84%. Note that the
uniform scenario's key space (~44 stations² × 7 weekdays) is finite, so the cache also warms during
that run. True worst-case uncached throughput is ~1 engine call per 5 ms per core (≈200 rps/core).

---

## 3. Capacity model for 100k req/s

Assume production traffic like the `mixed` scenario.

| Tier | What it absorbs | Target hit rate |
|---|---|---|
| Browser cache | Repeat autocomplete/schedule views | n/a |
| **CDN edge** (CloudFront/Cloudflare/Fastly) | Static assets (100%), autocomplete, schedules, categories, popular route searches | 85–95% of API GETs, 60–80% of routes |
| **In-pod LRU + coalescing** | Remaining hot keys | 80%+ (measured 84%) |
| **Engine** | True misses only | ≈200 rps per core uncached |

Worked example at **100,000 req/s** peak:
- With a conservative 80% blended edge hit rate, origin sees **~20,000 req/s**.
- Measured ~1,870 rps per 4-vCPU pod (with the load generator stealing CPU, so this is pessimistic) →
  **~11 pods** at 100% utilization; run at 60% target → **~18 pods** (72 vCPU).
- Without any CDN: ~54 pods at 100% → ~90 pods at 60%. The HPA max of 200 covers this as a
  degraded-mode fallback (e.g. CDN outage), so the edge is a cost optimization, not a single point
  of failure.
- Rough compute cost (on-demand, ARM 4-vCPU ≈ $0.14/h): 18 pods ≈ **$1.8k/month**; 90 pods
  ≈ $9k/month. Spot/savings plans cut this 40–60%. CDN egress dominates at this scale.
  Budget numbers are order-of-magnitude and must be re-derived from real traffic.

---

## 4. Phased plan with exit criteria

Each phase ships behind load tests. **A phase is complete only when its exit criteria pass on a
staging environment sized like production.**

### Phase 1: Single-node efficiency and safety ✅ (this change)
Exit: ≥5× baseline throughput, p99 < 500 ms at 100 connections, zero crashes under fuzzed input,
tests in CI. **Met:** 7–10×, p99 105–353 ms.

### Phase 2: Horizontal scale and edge (target: 20k req/s origin, 100k req/s at edge)
**Progress (shipped):** item 1 is done, item 3 is partly done (JSON logs), and the code part of
item 2 is done: `GET /api/route` exists and the frontend uses it. Cluster rollout, CDN and the
distributed load test still need cloud infrastructure.

1. ✅ CI pipeline (GitHub Actions): build engine, `npm test`, frontend build, image push, and a
   **load-test gate** (fail the PR if `mixed` p99 regresses > 20% vs `main`). *Shipped as
   `.github/workflows/ci.yml`: engine build, 12 backend integration tests, frontend typecheck and
   build, a `mixed` load test that fails on any error/non-2xx or p99 > 1 s, and a Docker build plus
   container smoke test. The relative-regression comparison vs `main` is a follow-up.*
2. Deploy `deploy/k8s` to a managed cluster across 3 AZs; CDN in front with the cache rules from
   `nginx.conf` (POST-body cache key for `/api/route`, or switch route search to
   `GET /api/route?from=…&to=…&date=…` so every CDN can cache it natively; **✅ done: the frontend now uses GET, and POST is kept for compatibility**).
3. ✅ Structured JSON logs (`LOG_FORMAT=json`). Still to do: OpenTelemetry traces (gateway → engine) + Grafana dashboards from
   `/metrics`.
4. **SLOs:** availability 99.9% (monthly), route search p99 < 300 ms at origin, autocomplete p99 <
   100 ms. Multi-window burn-rate alerts.
5. Edge security: WAF managed rules, bot management, per-IP and per-ASN rate limits, CSP header for
   the SPA.
6. Distributed load test (k6 cloud or several autocannon runners) proving **20k origin rps** with
   HPA scale-up < 2 min and no 5xx during a rolling deploy and during a forced pod kill.

### Phase 3: Algorithmic and data-path scale
**Progress (shipped):** items 1 and 4 are done. Items 2, 3 and 5 are not started.

1. ✅ **Exact Pareto router** (`engine/trip_router.cpp`, `GET /api/route/pareto`). For each number
   of changes it returns the earliest possible arrival, listed only if it beats every option with
   fewer changes.
   - *Why not classic RAPTOR:* RailYatra enforces a **maximum** transfer wait (`max_wait`). Under a
     maximum wait, arriving *earlier* at a junction can make a connection impossible, so RAPTOR's
     "keep the earliest arrival per station" labels would silently miss valid journeys. The
     implemented trip-based search labels concrete trip instances (train + calendar day) by
     boarding index, which stays exact under both the 30-min minimum and the maximum wait.
     Transfer windows are found by binary search over clock-sorted departures. That took mean
     latency from 13.3 to 8.9 ms with identical results (p99 46 ms at up to 5 changes).
   - *Validation* (`engine/tests/validate_pareto.py`, also run in CI): an independent Python
     checker re-reads the raw timetable and, over 450 random queries including city-to-city:
     (a) verifies every leg of **both** engines exists, runs that calendar day and respects the
     transfer windows; (b) matches a brute-force enumeration exactly for 0 and 1 changes;
     (c) confirms the Pareto router never arrives later than any classic-engine route with the same
     or fewer changes (strictly earlier in 16,034 of 18,197 comparisons, 88%); (d) checks the frontier
     strictly improves.
   - *Data-quality fix found by the validator:* `day_of_journey` in the source data is wrong for
     36 of 1,979 trains (e.g. 11466 lists UJN 23:50 as day 2), which shifted every later stop by
     a day. Ingestion now derives arrival/departure days from consecutive clock times. This is
     unambiguous because the largest gap between consecutive events in the data is 1,040 min
     (< 24 h). The fix applies to both engines and the schedule endpoint.
   - *UI:* a "Best trade-offs" panel above the results (feature #1 below). It loads independently
     of the main list, so a failure there never affects normal results.
   - The classic engine still powers the ranked list (up to 50 varied routes); the Pareto router
     complements it. Replacing the list entirely would change what users see, which is a product
     decision.
2. **Binary timetable artifact** (FlatBuffers/Cap'n Proto) built offline. *Lower priority than
   planned:* the engine currently loads the 16 MB JSON in ~0.35 s, so startup is not a bottleneck
   at this data size.
3. **Precompute and push to edge**: nightly materialize top-N O-D pairs × 7 weekdays into a KV
   (Redis/DynamoDB/edge KV). Popular searches never touch the engine.
4. ✅ **Data versioning + zero-downtime hot reload.** Responses carry `X-Data-Version` (content hash
   of the timetable). `SIGHUP` starts a complete new engine pool on the current data file and swaps
   it in only once it is ready. In-flight requests on the old pool finish, then it is stopped.
   Every response cache is invalidated, and a generation counter stops results computed before
   the swap from being cached. If the new pool fails, the old one keeps serving. Verified: a
   continuous-traffic test passes with zero failed requests during reload, and an end-to-end check
   (delete a train from the file, `kill -HUP`) shows the version changes and the train disappears
   without restarting the server. CDN copies expire on their own TTL (5 min for routes); purge the
   CDN after a reload if faster propagation is needed.
5. Multi-region active-active (read-only workload makes this straightforward): GeoDNS/anycast,
   per-region caches.

**Phase 3 load test** (same 4-vCPU box, 100 connections, 15 s; `loadtest/results/03-*`):
mixed traffic 2,061 rps / p99 142 ms. Pareto endpoint: 2,178 rps / p99 157 ms with realistic
popularity skew, and 554 rps / p99 429 ms with uniform (cache-hostile) traffic. All runs had zero
errors. Note: the uniform `route` scenario varies widely run to run on this shared box
(830–1,844 rps across four runs of near-identical code) because the cache warms during the run
and the load generator competes for CPU. Compare uniform-traffic numbers only across repeated
runs.

### Phase 4: Data platform and product features
**Progress (shipped):** the ingestion pipeline is built, as `datapipe/`. It handles sources in
priority order (the current JSON and any GTFS feed), validates and repairs data, gates on diffs,
publishes atomically, and runs a weekly refresh PR, all backed by tests and a CI data check. See
`datapipe/README.md` for the source research and the first-run findings. The blocker for complete,
current data is now **a licensed source**, not code. Postgres as source of truth (item 1) is
deferred: the versioned JSON plus manifest is sufficient until user data exists.

1. **Source of truth**: PostgreSQL (+PostGIS for station geography) for timetables, stations,
   cities, and user data; ingestion pipeline with validation (no negative distances, monotonic
   times, known stations) that emits the engine artifact. The query path stays in-memory; the DB is
   never on the hot path.
2. User accounts, saved journeys, alerts (Phase 5 features below need them).
3. Event pipeline (Kafka/Kinesis) for search analytics → drives precompute lists and product
   decisions.

### Reliability practices (all phases)
Timeouts and bounded queues everywhere (done in Phase 1); circuit breaking at the gateway; graceful
degradation (serve stale cache on engine failure, which the nginx config already does with
`proxy_cache_use_stale`); chaos drills (kill engines, kill pods, kill an AZ) every release cycle;
documented runbooks per alert.

---

## 5. Differentiating feature ideas

This is a brainstorm, not market-validated research. Indian rail data access is constrained:
there is no open official API for seat availability or live running. Features marked
**(data partner)** depend on licensed data (e.g. via an authorized IRCTC/NTES partner) and should
be validated legally before building.

| # | Feature | Why it's different / valuable | Feasibility |
|---|---|---|---|
| 1 | **Pareto route explorer** | Show the full trade-off frontier (fastest vs fewest changes vs shortest vs cheapest) on one chart instead of one sorted list. Falls out of RAPTOR (Phase 3). | High, own data |
| 2 | **Connection confidence score** | For every transfer, the probability of making it, based on the incoming train's historical delay distribution at that junction. Most apps show a 30-min rule; none quantify risk. | Medium (needs delay history, **data partner** or crowd-sourced) |
| 3 | **Confirmed-seat split routing** | When the direct train is waitlisted, find multi-train or split-ticket itineraries with confirmed availability. This is a real pain point in Indian rail. | Medium (**data partner** for availability) |
| 4 | **Sleep-aware routing** | Score itineraries on whether overnight hours are spent in a sleeper berth versus waiting on a platform at 3 AM. Penalize night-time transfers. | High, own data |
| 5 | **Layover intelligence** | For each transfer: platform-change walking time, lifts/ramps, cloak room, retiring rooms, food options, and "can I visit the city in this 6 h layover?" | Medium (curated station data) |
| 6 | **Accessibility-first routing** | Route only via transfers with step-free access; flag coaches/stations accordingly. Underserved and high-impact. | Medium (curated data) |
| 7 | **Disruption auto-replan** | Subscribe to a journey; on cancellation or major delay, push alternative routes immediately. | Medium (**data partner** for live status) |
| 8 | **Booking-window assistant** | Calendar reminders for ARP/Tatkal opening per leg of a multi-leg trip (legs open on different days). | High, own data |
| 9 | **Low-bandwidth access** | Offline PWA with cached timetables plus SMS/WhatsApp query interface for feature-phone users. | High |
| 10 | **"Arrive-by" and time-window search** | "Reach Delhi by 9 AM Friday" with latest-departure options. Natural with RAPTOR (reverse search). | High, own data |
| 11 | **Door-to-door city routing** | Extend existing CITY: multi-station search with metro/bus last-mile to the actual address. | Medium (GTFS feeds for metros) |
| 12 | **Group split planner** | Families/groups across multiple trains or coaches with a shared plan and costs. | Medium |

**Recommended first three** (highest value, no external data dependency): **#1 Pareto explorer**,
**#4 sleep-aware routing**, **#10 arrive-by search**. All three ride on the Phase 3 RAPTOR engine,
so engineering investment compounds.

---

## 6. Known remaining issues (tracked, not fixed here)

- Live Status: the endpoint now returns an explicit 503 "temporarily unavailable" message, which
  the page displays. A real implementation needs a licensed data source (feature #7).
- ✅ Removed the unused 5k-line `fareCalculator.ts` and the Windows-only `tests/test_engine.js`.
- The ranked list (classic engine) still includes dominated itineraries and near-duplicates
  differing only by transfer station. The "Best trade-offs" panel shows the clean Pareto set above
  it; whether to filter the list itself is a product decision.
