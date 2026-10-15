# RailYatra Deployment Guide

How to run RailYatra locally, deploy it to Railway with several replicas, put a
CDN in front, and prove the deployment handles the target load. Sizing comes
from `docs/CAPACITY.md`; architecture from `docs/ARCHITECTURE.md`.

## 1. Local (Docker)

The Dockerfile builds everything: the C++ engine, the frontend bundle and the
backend. No separate frontend build is needed.

```bash
docker build -t railyatra .
docker run -p 3000:3000 -e ENGINE_POOL_SIZE=2 railyatra
```

Open `http://localhost:3000`. `curl localhost:3000/readyz` returns
`{"status":"ready"}` once an engine has loaded the timetable.

## 2. Railway (recommended host)

`railway.json` in the repository configures the service: the Dockerfile at the
root is detected automatically, the deploy healthcheck is `/readyz`, the
restart policy is on-failure, and there are 3 replicas.

### Steps

1. **Create the service.** In Railway: New Project → Deploy from GitHub repo →
   select this repository. Railway builds the `Dockerfile` and applies
   `railway.json`.
2. **Set variables** (service → Variables). `PORT` is set by Railway; do not
   override it.

   | Variable | Value | Why |
   |---|---|---|
   | `ENGINE_POOL_SIZE` | `2` | Containers can report the host's core count; without this the default is capped at 4 |
   | `LOG_FORMAT` | `json` | One JSON line per log entry; each line includes the replica id |
   | `ROUTE_CACHE_MAX_MB` | `256` | Route cache memory budget |
   | `SMALL_CACHE_MAX_MB` | `32` | Schedule and station cache budgets |
   | `TRUST_PROXY` | `1` (Railway only) or `2` (Cloudflare in front) | Proxy hops trusted for the real client IP; wrong values make rate limits per-proxy or spoofable |

3. **Resources.** Give each replica about **2 vCPU and 1 GB memory** if your
   plan allows; that is the size `docs/CAPACITY.md` measured (~1,900 req/s
   per replica). Memory use stays under ~510 MB with the default budgets.
4. **Replicas.** `railway.json` asks for 3 (high availability). Raise the
   count for more capacity: ~1,140 req/s per replica at a 60% target. Replica
   limits depend on your Railway plan.
5. **Deploy and check.** Open `https://<your-service>.up.railway.app/readyz`.
   To confirm all replicas serve traffic:

   ```bash
   cd loadtest && npm ci
   node probe-instances.js https://<your-service>.up.railway.app 60 --min-instances 3
   ```

### Railway behaviours to know

- **Healthchecks run only at deploy time.** Railway does not keep probing
  `/readyz` afterwards. RailYatra heals itself: crashed engines restart
  automatically, and if the process dies Railway's on-failure policy restarts
  it. For ongoing monitoring, point an uptime checker at `/readyz`.
- **Traffic is spread across replicas without sticky sessions.** That is fine:
  instances share no state.
- **Railway's metrics view is not per replica.** Every response carries an
  `X-Instance-Id` header and JSON logs include `instance`, so you can tell
  replicas apart.
- **Data updates** are deploys: the weekly data-refresh PR (see
  `datapipe/README.md`), once merged, triggers a new deploy, which Railway rolls
  out behind the healthcheck.

### Rate limiting

Each instance limits clients by IP (IPv6 by /64), in two layers:

| Limit | Default | Applies to |
|---|---|---|
| Requests | 50/s per client, bursts of 200 (`RATE_LIMIT_RPS`, `RATE_LIMIT_BURST`) | every `/api` call except `/api/health` |
| Engine work | 5/s per client, bursts of 30 (`ENGINE_RATE_LIMIT_RPS`, `ENGINE_RATE_LIMIT_BURST`) | only searches **not** already cached |

Popular (cached) searches are never throttled; a client spraying unique
searches is. Limited requests get `429` with `Retry-After`, counted in
`railyatra_rate_limited_total`. Defaults are generous because many mobile users
share one carrier IP. Limits are per instance, so the fleet-wide limit is
roughly limit x replicas; for a hard global limit, add a Cloudflare rate-limiting
rule. Turn limits off with `RATE_LIMIT_ENABLED=0` (only for load tests).

**Set `TRUST_PROXY` correctly.** With Cloudflare in front, use `2`. If people can
reach the `*.up.railway.app` address directly, they can bypass Cloudflare and
forge their apparent IP; avoid publishing that address.

## 3. CDN in front (Cloudflare, free plan)

Each replica caches in its own memory, so the more replicas you run, the
colder each cache is. A CDN is the shared cache: popular searches are answered
at the edge and never reach Railway. The API is built for this:

- successful route, trade-off, schedule, station and category responses send
  `Cache-Control: public, max-age=…`;
- health, readiness, metrics, live status and **every error** send
  `Cache-Control: no-store`, so the edge never caches a failure;
- hashed frontend assets are `immutable`, and `index.html` is `no-cache`, so a
  deploy never leaves users with a stale page;
- route search uses `GET` with the parameters in the URL, so the URL is the
  cache key.

### Steps

1. Add your domain to Cloudflare and create a **proxied** (orange-cloud) DNS
   record pointing at the Railway service; add the same custom domain in
   Railway (service → Settings → Networking).
2. Cloudflare does not cache JSON by default. Add a **Cache Rule**:
   - When: hostname equals your domain **and** URI path starts with `/api/`
   - Then: **Eligible for cache**, with Edge TTL set to **"Use cache-control
     header if present, bypass cache if not"**, so `no-store` responses and
     anything without a header are never cached.
3. Verify: request a route search twice and check the `cf-cache-status`
   response header goes from `MISS` to `HIT`; `/api/health` must stay
   `BYPASS` or `DYNAMIC`.

After a timetable update, purge the Cloudflare cache (or wait out the 5-minute
route TTL) so users see the new data immediately.

## 4. Prove it: distributed load test

`.github/workflows/loadtest.yml` (Actions tab → *Distributed load test* → Run
workflow; it appears once the file is on the default branch). It:

1. validates the inputs, checks `/readyz`, and verifies at least
   `min_instances` distinct replicas answer;
2. starts `runners` GitHub machines that wait for a common start time, then
   each sends `total_rate / runners` requests per second for `duration`
   seconds;
3. combines the results into one pass/fail verdict on the job summary page:
   p99 upper bound, failure rate, 503 shed rate and status codes.

Before running it, set `RATE_LIMIT_ENABLED=0` on the staging service (each
runner is a single IP sending hundreds of requests per second, which the
per-client limits would correctly throttle), and turn it back on afterwards.

Suggested ladder against a staging deployment (never production without
warning):

| Run | total_rate | runners | connections_per_runner | Expect |
|---|---|---|---|---|
| 1 | 1000 | 2 | 100 | PASS, baseline |
| 2 | 3000 | 3 | 200 | PASS with 3 replicas |
| 3 | 6000 | 6 | 300 | add replicas until it passes |
| 4 | 10000 | 10 | 300 | the 100k-concurrent-user peak (`docs/CAPACITY.md`) |

Record the replica count at which each step passes; that, not the
single-machine model, is the real capacity number. Each GitHub runner has
limited CPU, so if a runner's own p99 is far above the others, add runners
rather than raising the rate per runner.

## 5. Kubernetes

`deploy/k8s/railyatra.yaml` has the same sizing (2 vCPU, 512Mi request,
768Mi limit, `ENGINE_POOL_SIZE=2`), readiness and liveness probes, zone
spreading, a PodDisruptionBudget and an autoscaler (3–100 replicas).
`deploy/docker-compose.yml` with `deploy/nginx/nginx.conf` runs several
replicas behind nginx on one host. Neither has been run against a real
cluster yet; validate them in staging first.

## 6. Without Docker (Linux)

```bash
make -C engine                 # builds engine/route_engine (Windows: engine/build.ps1)
cd frontend && npm ci && npm run build && cd ..
cd backend && npm ci && ENGINE_POOL_SIZE=2 node server.js
```

The backend serves `frontend/dist` automatically.

## Environment variables

All variables are validated at startup; an invalid value stops the server with
a clear message. The full list is in `docs/ARCHITECTURE.md` (Configuration).
`PDF_BASE_URL` (optional) redirects schedule PDF downloads to external
storage, e.g. `https://storage.example.com/pdfs`.
