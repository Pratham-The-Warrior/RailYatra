# RailYatra architecture

A **modular monolith**: one deployable service, built from loosely coupled
modules behind stable interfaces. It scales horizontally by running more
identical instances behind a load balancer and CDN (see
`docs/CAPACITY.md` for measured sizing and `docs/SCALING_ROADMAP.md`), and any module can later be extracted into its
own service without rewriting its callers.

```
                    CDN / load balancer (deploy/nginx, deploy/k8s)
                                   │
 frontend (React) ──HTTP──▶  backend instance (stateless, N replicas)
                             ├─ app.js            HTTP pipeline: security headers, metrics, error handling
                             ├─ modules/          one folder per feature, each mounts its own router
                             │    journeys · stations · schedule · categories · pdf · livestatus · system
                             ├─ platform/         shared, stable building blocks (no feature logic)
                             │    config · logger · metrics · cache (CachePort) · errors · validation
                             │    referenceData · routing (RoutingPort)
                             └─ container.js      composition root: builds and wires everything once
                                   │ RoutingPort ("local" adapter)
                             engine pool: N C++ processes, JSON-lines protocol (engine/handlers.hpp)
                                   │
                             timetable + reference files, published by datapipe/
```

## Rules that keep it loosely coupled

1. **Modules never import other modules.** Shared needs go into `platform/`.
2. **Modules never construct infrastructure.** They receive `deps` from the
   container: `config`, `routing`, `caches`, `referenceData`, `log`, `metrics`.
3. **Platform never imports modules.** Dependencies point one way:
   `modules → platform`.
4. **Ports, not implementations.** Features call `routing.request(...)` and
   `caches.create(...)`. Swapping the routing backend (a remote engine
   service) or the cache store (Redis) changes one adapter and the container,
   not features.
5. **Errors are values with a status.** Throw `badRequest()` / `notFound()`
   from `platform/errors`; the central handler formats them. Unexpected
   errors become a generic 500 and are logged, never leaked.

## Adding a feature

```js
// backend/src/modules/example/index.js
const express = require('express');
function createRouter({ routing, caches }) {
    const router = express.Router();
    router.get('/', async (req, res) => res.json(await routing.request({ type: 'route', ... })));
    return router;
}
module.exports = { name: 'example', mountPath: '/api/example', createRouter };
```

Then add `require('./example')` to `backend/src/modules/index.js`. Nothing
else changes. `test/lifecycle.test.js` shows a module plugged in at runtime.

Adding an **engine capability** is the same idea in C++: write a function with
the `Handler` signature and register it in `makeHandlerRegistry()`
(`engine/handlers.cpp`). Prove refactors change nothing with
`python3 engine/tests/golden_protocol.py <old-binary> <new-binary>`.

## API contract

`docs/openapi.json` (OpenAPI 3.1) is the contract between frontend and backend.
`backend/test/contract.test.js` calls every documented operation, including
error responses, and validates each real response against the schema for its
status code. It also fails if a feature module or a spec path is not covered.
The frontend reaches the backend only through `frontend/src/api/endpoints.ts`,
which owns every URL; components keep their own loading and error handling.

Changing an endpoint therefore means: update the module, the spec and
`endpoints.ts` together; the contract test proves they agree.

## Lifecycle

| Event | What happens |
|---|---|
| Start | `container.start()` loads reference data (fails fast if `stations.json` is broken), starts the engine pool. `/readyz` is 503 until an engine is ready. |
| Engine crash | Its in-flight requests fail immediately; it restarts with backoff (1 s → 30 s). Other engines keep serving. |
| `SIGHUP` (data reload) | `container.reloadData()`: parse new reference files → start and swap a new engine pool → swap reference data → clear every cache. Any failure leaves the old state serving. Station search indexes rebuild on the swap. |
| `SIGTERM` | Stop accepting connections, drain, stop engines, wait until they exit, exit 0. |

## Configuration

All environment variables are read and validated once in
`platform/config.js`. An invalid value stops startup with a clear message
instead of silently falling back.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | 3000 | HTTP port |
| `ENGINE_POOL_SIZE` | min(4, CPU cores) | Engine processes per instance (set it explicitly in containers) |
| `ENGINE_TIMEOUT_MS` | 10000 | Per-request engine timeout |
| `ENGINE_MAX_QUEUE` | 200 | In-flight requests per engine before shedding with 503 |
| `ROUTE_CACHE_SIZE` / `ROUTE_CACHE_TTL_MS` | 50000 / 30 min | Route cache entry limit and lifetime |
| `ROUTE_CACHE_MAX_MB` / `SMALL_CACHE_MAX_MB` | 256 / 32 | Cache memory budgets (route; schedule and stations) |
| `TRAIN_DATA_PATH` | `master_train_data.json` | Timetable file loaded by the engines |
| `REFERENCE_DATA_DIR` | project root | Where `stations.json`, `city_stations.json`, category files live |
| `ROUTING_ADAPTER` | `local` | RoutingPort implementation |
| `LOG_FORMAT` | text | `json` for one JSON object per line |
| `TRUST_PROXY` | 1 | Trusted proxy hops for the client IP (2 with Cloudflare + Railway) |
| `RATE_LIMIT_ENABLED` | 1 | Per-client rate limits (disable only for load tests) |
| `RATE_LIMIT_RPS` / `RATE_LIMIT_BURST` | 50 / 200 | Per-client API request limit |
| `ENGINE_RATE_LIMIT_RPS` / `ENGINE_RATE_LIMIT_BURST` | 5 / 30 | Per-client limit on uncached searches (engine work) |
| `INSTANCE_ID` | `RAILWAY_REPLICA_ID` or random | Instance id in logs, `/api/health` and the `X-Instance-Id` header |

## Testing

| Layer | Command |
|---|---|
| Backend (integration, architecture, API contract) | `cd backend && npm test` |
| Engine correctness | `python3 engine/tests/validate_pareto.py 150 1` |
| Engine protocol stability | `python3 engine/tests/golden_protocol.py <ref> <candidate>` |
| Data pipeline | `python3 -m unittest discover -s datapipe/tests -t .` and `python3 -m datapipe check` |
| Load | `cd loadtest && node run.js mixed --url http://localhost:3000` |
