/**
 * Backend integration tests. Requires a built engine (engine/route_engine).
 * Run: npm test
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');

process.env.ENGINE_POOL_SIZE = '2';
const app = require('../src/app');
const engine = require('../src/services/engine.service');
const { _internals } = require('../src/api/controllers/route.controller');

let server, base;

before(async () => {
    engine.spawnEngine();
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    for (let i = 0; i < 100 && !engine.isReady(); i++) await new Promise(r => setTimeout(r, 100));
    assert.ok(engine.isReady(), 'engine did not become ready');
});

after(() => { engine.shutdown(); server.close(); });

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
