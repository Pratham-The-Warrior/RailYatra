# Capacity model: 100,000 concurrent users

Every number here was measured on this codebase. Assumptions are labelled as
such. Raw results are in `loadtest/results/05-*.json`.

## 1. From users to requests (assumption)

Concurrent users are not requests per second. An active RailYatra user types
in station autocomplete (debounced to one request per 250 ms pause, so ~2–4
requests per station), searches (2 requests: route list and trade-offs), then
reads results. Averaged over a session we assume **one request every 10–20 s
per active user**:

| Concurrent users | Average rate | Peak (design target) |
|---|---|---|
| 100,000 | ~5,000 req/s (1 per 20 s) | **~10,000 req/s** (1 per 10 s) |

Replace this assumption with real analytics as soon as traffic exists.

## 2. Measured capacity per instance

Server pinned to N cores with `taskset`; load generator on the other cores, so
they do not compete. Realistic traffic mix (`loadtest/run.js mixed`: 60%
autocomplete, 25% route search with popular-route skew, 10% schedule,
5% category), 64 connections, 20 s.

| Instance size | Engines | Throughput | p50 | p99 | Errors |
|---|---|---|---|---|---|
| 1 vCPU | 1 | 805 req/s | 5 ms | 694 ms | 0 |
| 2 vCPU | 1 | 1,903 req/s | 7 ms | 358 ms | 0 |
| **2 vCPU** | **2** | **1,907 req/s** | 23 ms | **259 ms** | 0 |

**Bottleneck:** the Node.js gateway's single thread. During the 2-vCPU run the
gateway used ~91% of one core while the engines were lightly loaded (most
requests are cache hits). A second engine did not add throughput but cut p99
from 358 to 259 ms, because cache misses queue behind each other less.
JSON serialization of cached route lists costs only ~9% of a core at 1,000
responses/s, so most of the gateway cost is per-request HTTP handling; the
answer is more instances, not micro-optimization.

**Decision:** 2-vCPU instances with 2 engines (`deploy/k8s`, `deploy/docker-compose.yml`).
Bigger instances add little: earlier 4-vCPU runs reached about the same throughput
(~2,000 req/s), though the load generator shared those cores, so treat that as indicative.

**Memory:** 184 MB measured after load (gateway 77 MB, 2 engines 107 MB). Caches
are byte-budgeted (route 256 MB, schedule 32 MB, stations 32 MB; enforced and
exported as `railyatra_cache_bytes`), so the worst case is ~510 MB, which gives a
768 Mi limit. Before the budget, the route cache was bounded only by entry count
(50,000 × ~35 KB ≈ 1.7 GB, an out-of-memory risk under cache-hostile traffic).

## 3. Many concurrent connections

10,000 concurrent keep-alive connections, total rate capped at 1,500 req/s,
against one 2-vCPU instance (`--connections 10000 --rate 1500`):

| Measure | Value |
|---|---|
| Server-side latency (from `/metrics`) | p50 ≤ 1 ms, p90 ≤ 2 ms |
| Errors / timeouts | 0 / 0 |
| Shed with 503 (engine queue full) | ~100 per run |

The load generator opens all 10,000 connections and fires a request on each at
the same instant. That synchronized burst produces a fixed cost of ~3,300 slow
requests (≤ 2.5 s) and ~100 fast 503s. Doubling the run from 30 s to 60 s
doubled the total but not the slow count (3,434 → 3,218), which confirms it is
the burst and not steady state. A real reconnect storm (e.g. after a deploy)
behaves the same way: the instance sheds a small fraction quickly instead of
collapsing. Client-side latency in this test is dominated by the load generator
itself (10,000 sockets on one thread), so use the server-side histogram.

## 4. Fleet size for 100,000 concurrent users

Design at 60% CPU per instance: 1,907 × 0.6 ≈ **1,140 req/s per instance**.

| Scenario | Origin load | Instances (2 vCPU) | vCPUs |
|---|---|---|---|
| Peak, no CDN | 10,000 req/s | **9** | 18 |
| Average, no CDN | 5,000 req/s | 5 | 10 |
| Peak, CDN absorbs 80% of cacheable GETs | ~2,000 req/s | 3 (HA minimum) | 6 |
| Autoscaler ceiling (`maxReplicas: 100`) | ~190,000 req/s at 100% | 100 | 200 |

Order-of-magnitude cost: 9 × 2-vCPU instances is roughly $450–500 per month
on-demand on major clouds (ARM, e.g. AWS c7g.large class). Verify current
prices; spot and savings plans cut this substantially.

## 5. Known limits of this model

- **Single machine.** All measurements come from one 4-vCPU box. Instances
  share nothing (no sticky sessions, no shared state), so throughput should
  scale linearly behind a load balancer, but that is an expectation until it
  is measured in staging.
- **Per-instance caches.** Each instance warms its own cache, so more instances
  mean a lower hit rate each. The CDN (shared cache at the edge) offsets this.
  If origin hit rate drops too far, add a Redis implementation of the
  CachePort (`backend/src/platform/cache.js`); no feature module changes.
- **Cache-hostile traffic.** A route search that misses every cache costs
  ~5 ms of engine CPU, so ~200 misses/s per engine core. Rate limiting at
  the edge (`deploy/nginx/nginx.conf`) protects against abusive patterns.

## 6. Validating in staging (before claiming the number)

1. Deploy `deploy/k8s/railyatra.yaml` with 3 replicas behind the ingress.
2. From 2–3 separate load machines run
   `node loadtest/run.js mixed --url https://<staging> --connections 2000 --rate <per-machine share> --duration 300`.
3. Step the total rate 3k → 6k → 10k req/s; check that the autoscaler adds
   instances, server-side p99 stays < 300 ms, and errors stay at 0 (503 sheds
   only during scale-up).
4. Kill an instance mid-test; requests must keep succeeding (readiness probe +
   PodDisruptionBudget).

## Reproducing the single-instance numbers

```bash
cd backend && PORT=3300 ENGINE_POOL_SIZE=2 taskset -c 0-1 node server.js &
cd ../loadtest && taskset -c 2-3 node run.js mixed --url http://localhost:3300 --connections 64 --duration 20
taskset -c 2-3 node run.js mixed --url http://localhost:3300 --connections 10000 --rate 1500 --duration 60
curl -s localhost:3300/metrics | grep http_request_ms_bucket   # server-side latency
```
