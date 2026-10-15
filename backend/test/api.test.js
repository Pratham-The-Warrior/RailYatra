/**
 * Backend integration tests. Requires a built engine (engine/route_engine).
 * Run: npm test
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');

const { createContainer } = require('../src/container');
const { createApp } = require('../src/app');
const { weekdayOf } = require('../src/platform/validation');
const { resolveStationCodes } = require('../src/modules/journeys/stationResolver');

const container = createContainer({ env: { ...process.env, RATE_LIMIT_ENABLED: '0', ENGINE_POOL_SIZE: '2' } });
// Thin adapters so the assertions below read the same as before the refactor.
const engine = {
    isReady: () => container.routing.isReady(),
    status: () => container.routing.status(),
    reload: () => container.reloadData(),
    shutdown: () => container.shutdown()
};
const _internals = {
    weekdayOf,
    resolveStationCodes: (input) => resolveStationCodes(input, container.referenceData.current().cities,
        container.config.limits.maxCityStations),
    get routeCache() { return container.caches.get('route'); }
};

let server, base;

before(async () => {
    container.start();
    const app = createApp(container);
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    for (let i = 0; i < 100 && !engine.isReady(); i++) await new Promise(r => setTimeout(r, 100));
    assert.ok(engine.isReady(), 'engine did not become ready');
});

after(async () => { await engine.shutdown(); server.close(); });

const post = (body) => fetch(`${base}/api/route`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
});

test('weekdayOf validates dates', () => {
    assert.strictEqual(_internals.weekdayOf('2026-10-20'), 2);
    assert.strictEqual(_internals.weekdayOf('2026-02-31'), -1);
    assert.strictEqual(_internals.weekdayOf('garbage'), -1);
});

test('resolveStationCodes rejects junk and expands cities', () => {
    assert.deepStrictEqual(_internals.resolveStationCodes('New Delhi (NDLS)'), ['NDLS']);
    assert.deepStrictEqual(_internals.resolveStationCodes('../../etc'), []);
    assert.ok(_internals.resolveStationCodes('CITY:MUMBAI').length > 1);
});

test('route search returns direct trains first', async () => {
    const res = await post({ from: 'NDLS', to: 'CSMT', date: '2026-10-20', max_switches: 1, top_k: 5 });
    assert.strictEqual(res.status, 200);
    const routes = await res.json();
    assert.ok(routes.length > 0);
    assert.strictEqual(routes[0].switches, 0);
});

test('identical requests on the same weekday are served from cache', async () => {
    const body = { from: 'KOP', to: 'HWH', date: '2026-10-20', max_switches: 2, top_k: 5 };
    const a = await (await post(body)).json();
    const b = await (await post({ ...body, date: '2026-10-27' })).json(); // also a Tuesday
    assert.deepStrictEqual(a, b);
    assert.ok(_internals.routeCache.size >= 1);
});

test('distance sort orders by total distance', async () => {
    const res = await post({ from: 'NDLS', to: 'CSMT', date: '2026-10-20', max_switches: 1, top_k: 10, sort_by: 'distance' });
    const routes = await res.json();
    const oneSwitch = routes.filter(r => r.switches === 1).map(r => r.total_distance_km);
    assert.deepStrictEqual(oneSwitch, [...oneSwitch].sort((x, y) => x - y));
});

test('validation errors return 400', async () => {
    assert.strictEqual((await post({ from: 'NDLS' })).status, 400);
    assert.strictEqual((await post({ from: 'NDLS', to: 'CSMT', date: '2026-13-01' })).status, 400);
    assert.strictEqual((await post({ from: 'NDLS', to: 'NDLS', date: '2026-10-20' })).status, 400);
    assert.strictEqual((await post({ from: 'XXXX', to: 'CSMT', date: '2026-10-20' })).status, 400);
});

test('huge max_switches is clamped, not crashing the engine', async () => {
    const res = await post({ from: 'KOP', to: 'HWH', date: '2026-10-20', max_switches: 100000000, top_k: 999999 });
    assert.strictEqual(res.status, 200);
    assert.ok((await res.json()).length <= 50);
});

test('schedule, stations, category endpoints', async () => {
    const s = await fetch(`${base}/api/schedule/12138`);
    assert.strictEqual(s.status, 200);
    assert.strictEqual((await s.json()).train_number, '12138');
    assert.strictEqual((await fetch(`${base}/api/schedule/..%2F..%2Fx`)).status, 400);
    const st = await (await fetch(`${base}/api/stations?q=mumbai`)).json();
    assert.ok(st[0].isCity);
    assert.strictEqual((await fetch(`${base}/api/category/vandebharat`)).status, 200);
    assert.strictEqual((await fetch(`${base}/api/category/..%2F..%2Fbackend%2Fpackage`)).status, 404);
});

test('unknown API path returns 404 instead of hanging', async () => {
    const res = await fetch(`${base}/api/does-not-exist`, { signal: AbortSignal.timeout(2000) });
    assert.strictEqual(res.status, 404);
});

test('health, readiness and metrics', async () => {
    assert.strictEqual((await fetch(`${base}/readyz`)).status, 200);
    const m = await (await fetch(`${base}/metrics`)).text();
    assert.match(m, /railyatra_http_requests_total/);
    assert.match(m, /railyatra_cache_hits_total/);
});

test('GET /api/route matches POST and is cacheable', async () => {
    const params = { from: 'NDLS', to: 'CSMT', date: '2026-10-20', max_switches: 1, top_k: 5 };
    const viaPost = await (await post(params)).json();
    const res = await fetch(`${base}/api/route?${new URLSearchParams(params)}`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('cache-control'), /public/);
    assert.deepStrictEqual(await res.json(), viaPost);
    assert.strictEqual((await fetch(`${base}/api/route?from=NDLS`)).status, 400);
});

test('live status endpoint explains it is unavailable', async () => {
    const res = await fetch(`${base}/api/livestatus/12138`);
    assert.strictEqual(res.status, 503);
    assert.match((await res.json()).error, /unavailable/i);
});

test('pareto endpoint returns a strictly improving frontier', async () => {
    const res = await fetch(`${base}/api/route/pareto?from=NDLS&to=CSMT&date=2026-10-20&max_switches=3`);
    assert.strictEqual(res.status, 200);
    const routes = await res.json();
    assert.ok(routes.length >= 1);
    for (let i = 1; i < routes.length; i++) {
        assert.ok(routes[i].switches > routes[i - 1].switches);
        // later departures can make total time misleading; compare absolute arrival
        const arrival = (r) => {
            const [h, m] = r.legs[0].departure_time.split(':').map(Number);
            return h * 60 + m + r.total_time_min;
        };
        assert.ok(arrival(routes[i]) < arrival(routes[i - 1]));
    }
});

test('pareto endpoint validates like the list endpoint', async () => {
    const get = (qs) => fetch(`${base}/api/route/pareto?${qs}`);
    assert.strictEqual((await get('from=NDLS&to=NDLS&date=2026-10-20')).status, 400);
    assert.strictEqual((await get('from=XXXX&to=CSMT&date=2026-10-20')).status, 400);
    assert.strictEqual((await get('from=NDLS&to=CSMT&date=bad')).status, 400);
    const city = await get('from=CITY:MUMBAI&to=CITY:DELHI&date=2026-10-20');
    assert.strictEqual(city.status, 200);
    assert.ok((await city.json()).length >= 1);
});

test('cache generation guard drops results computed before a clear', async () => {
    const { LruCache } = require('../src/platform/cache');
    const c = new LruCache({ name: 'test', maxEntries: 10, ttlMs: 60000 });
    let release;
    const pending = c.getOrCompute('k', () => new Promise((r) => { release = r; }));
    c.clear();                       // e.g. a timetable reload happens mid-flight
    while (!release) await new Promise((r) => setImmediate(r));   // compute starts on a later tick
    release('stale');
    assert.strictEqual(await pending, 'stale');   // caller still gets its answer
    assert.strictEqual(c.get('k'), undefined);    // but it is not cached
});

test('timetable hot reload swaps engines without failing in-flight traffic', async () => {
    const before = await (await fetch(`${base}/api/health`)).json();
    assert.match(before.dataVersion, /^[0-9a-f]{12}$/);
    const oldPids = engine.status().length;

    // Keep traffic flowing during the reload; every request must succeed.
    let stop = false, ok = 0, failed = 0;
    const load = (async () => {
        let i = 0;
        while (!stop) {
            const date = `2026-11-${String((i++ % 28) + 1).padStart(2, '0')}`;
            const r = await fetch(`${base}/api/route?from=KOP&to=HWH&date=${date}&max_switches=2&top_k=5`);
            if (r.status === 200) ok++; else failed++;
        }
    })();
    const version = await engine.reload();
    await new Promise((r) => setTimeout(r, 300));
    stop = true;
    await load;

    assert.strictEqual(failed, 0);
    assert.ok(ok > 0);
    assert.strictEqual(version, before.dataVersion);           // same file, same hash
    assert.ok(engine.isReady());
    assert.strictEqual(engine.status().length, oldPids);
    assert.strictEqual(_internals.routeCache.size <= 28, true);   // caches were cleared
    const res = await fetch(`${base}/api/route?from=NDLS&to=CSMT&date=2026-10-20&top_k=3`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('x-data-version'), version);
});

test('cache recovers after a compute function throws (sync or async)', async () => {
    const { LruCache } = require('../src/platform/cache');
    const c = new LruCache({ name: 'test2', maxEntries: 10, ttlMs: 60000 });
    await assert.rejects(c.getOrCompute('a', () => { throw new Error('sync boom'); }), /sync boom/);
    await assert.rejects(c.getOrCompute('b', async () => { throw new Error('async boom'); }), /async boom/);
    assert.strictEqual(await c.getOrCompute('a', async () => 1), 1);
    assert.strictEqual(await c.getOrCompute('b', async () => 2), 2);
    assert.strictEqual(c.inflight.size, 0);
});
