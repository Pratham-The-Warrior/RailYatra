/**
 * Architecture and lifecycle tests: data reload consistency, engine process
 * ownership, configuration validation, module contract, error handling.
 * Requires a built engine (engine/route_engine).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

const { createContainer } = require('../src/container');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/platform/config');
const { badRequest } = require('../src/platform/errors');
const modules = require('../src/modules');

const ROOT = path.resolve(__dirname, '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms = 15000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (fn()) return true; await sleep(50); }
    return fn();
};

// Isolated copy of the reference data so tests can change it.
const refDir = fs.mkdtempSync(path.join(os.tmpdir(), 'railyatra-ref-'));
for (const f of ['stations.json', 'city_stations.json', 'master_train_data_vandebharat.json']) {
    fs.copyFileSync(path.join(ROOT, f), path.join(refDir, f));
}

const container = createContainer({ env: { ...process.env, ENGINE_POOL_SIZE: '1', REFERENCE_DATA_DIR: refDir } });
let server, base;

before(async () => {
    container.start();
    server = createApp(container).listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    assert.ok(await waitFor(() => container.routing.isReady()), 'engine did not become ready');
});

after(async () => {
    await container.shutdown();
    server.close();
    fs.rmSync(refDir, { recursive: true, force: true });
});

const getJson = async (p) => { const r = await fetch(base + p); return { status: r.status, body: await r.json() }; };

test('data reload refreshes station search and categories (not just the engine)', async () => {
    const before = await getJson('/api/stations?q=zzqtest');
    assert.ok(!before.body.some((s) => s.code === 'ZZQ'));

    const stations = JSON.parse(fs.readFileSync(path.join(refDir, 'stations.json'), 'utf8'));
    stations.push({ name: 'ZZQTEST HALT', code: 'ZZQ' });
    fs.writeFileSync(path.join(refDir, 'stations.json'), JSON.stringify(stations));
    const vb = JSON.parse(fs.readFileSync(path.join(refDir, 'master_train_data_vandebharat.json'), 'utf8'));
    fs.writeFileSync(path.join(refDir, 'master_train_data_vandebharat.json'), JSON.stringify(vb.slice(0, 5)));

    await container.reloadData();

    const after = await getJson('/api/stations?q=zzqtest');
    assert.ok(after.body.some((s) => s.code === 'ZZQ'), 'new station not searchable after reload');
    assert.strictEqual((await getJson('/api/category/vandebharat')).body.length, 5);
});

test('a broken reference file aborts the reload and changes nothing', async () => {
    const good = fs.readFileSync(path.join(refDir, 'stations.json'), 'utf8');
    const pidsBefore = container.routing.status().map((w) => w.pid);
    fs.writeFileSync(path.join(refDir, 'stations.json'), '{ not json');
    try {
        await assert.rejects(container.reloadData());
        assert.deepStrictEqual(container.routing.status().map((w) => w.pid), pidsBefore, 'engines must not be swapped');
        assert.ok((await getJson('/api/stations?q=zzqtest')).body.some((s) => s.code === 'ZZQ'), 'old data still served');
    } finally {
        fs.writeFileSync(path.join(refDir, 'stations.json'), good);
    }
});

test('an engine crash followed by a reload leaves no orphaned engine process', async () => {
    const pool = container.routing;
    const [w] = pool.status();
    process.kill(w.pid, 'SIGKILL');                       // worker now waits ~1s to respawn
    assert.ok(await waitFor(() => !pool.isReady(), 5000));
    await container.reloadData();                         // retires the crashed worker during its delay
    await sleep(2500);                                    // past the respawn delay
    assert.ok(pool.isReady());
    assert.strictEqual(pool.processCount(), 1, 'exactly one engine process should exist');
    assert.strictEqual((await getJson('/api/route?from=NDLS&to=CSMT&date=2026-10-20&top_k=3')).status, 200);
});

test('shutdown during a reload stops the engines that were still starting', async () => {
    const c = createContainer({ env: { ...process.env, ENGINE_POOL_SIZE: '1', REFERENCE_DATA_DIR: refDir } });
    c.start();
    assert.ok(await waitFor(() => c.routing.isReady()));
    const reload = c.reloadData();
    await waitFor(() => c.routing.processCount() === 2, 5000); // new pool spawned, not yet swapped
    const stopped = c.shutdown();
    await assert.rejects(reload);
    assert.strictEqual(await stopped, true);
    assert.ok(await waitFor(() => c.routing.processCount() === 0, 10000), 'all engine processes must exit');
});

test('configuration fails fast on invalid values', () => {
    assert.throws(() => loadConfig({ ENGINE_POOL_SIZE: '0' }), /ENGINE_POOL_SIZE/);
    assert.throws(() => loadConfig({ ENGINE_POOL_SIZE: 'four' }), /ENGINE_POOL_SIZE/);
    assert.throws(() => loadConfig({ PORT: '70000' }), /PORT/);
    assert.throws(() => loadConfig({ ROUTING_ADAPTER: 'magic' }), /ROUTING_ADAPTER/);
    assert.strictEqual(loadConfig({}).port, 3000);
    assert.strictEqual(loadConfig({ ENGINE_POOL_SIZE: '3' }).enginePoolSize, 3);
    // Containers can report the host's core count: the default must stay bounded.
    assert.ok(loadConfig({}).enginePoolSize >= 1 && loadConfig({}).enginePoolSize <= 4);
    assert.strictEqual(loadConfig({ RAILWAY_REPLICA_ID: 'r-abc' }).instanceId, 'r-abc');
    assert.match(loadConfig({}).instanceId, /^[0-9a-f]{8}$/);
});

test('every feature module honours the module contract', () => {
    const names = new Set();
    for (const m of modules) {
        assert.strictEqual(typeof m.name, 'string');
        assert.ok(!names.has(m.name), `duplicate module name ${m.name}`);
        names.add(m.name);
        assert.match(m.mountPath, /^\//);
        assert.strictEqual(typeof m.createRouter, 'function');
    }
});

test('a new module plugs in without touching existing code, and errors are handled centrally', async () => {
    const extra = {
        name: 'example',
        mountPath: '/api/example',
        createRouter: () => {
            const r = express.Router();
            r.get('/ok', (req, res) => res.json({ ok: true }));
            r.get('/bad', () => { throw badRequest('nope'); });
            r.get('/boom', async () => { throw new Error('secret detail'); });
            return r;
        }
    };
    // A separate container: each app instance owns its caches (names are unique per registry).
    const c = createContainer({ env: { ...process.env, ENGINE_POOL_SIZE: '1', REFERENCE_DATA_DIR: refDir } });
    c.start();
    const s = createApp(c, { featureModules: [...modules, extra] }).listen(0);
    const url = `http://127.0.0.1:${s.address().port}`;
    try {
        assert.ok(await waitFor(() => c.routing.isReady()));
        assert.deepStrictEqual(await (await fetch(url + '/api/example/ok')).json(), { ok: true });
        const bad = await fetch(url + '/api/example/bad');
        assert.strictEqual(bad.status, 400);
        assert.deepStrictEqual(await bad.json(), { error: 'nope' });
        const boom = await fetch(url + '/api/example/boom');
        assert.strictEqual(boom.status, 500);
        assert.deepStrictEqual(await boom.json(), { error: 'Internal server error' });
        assert.strictEqual((await fetch(url + '/api/route?from=NDLS&to=CSMT&date=2026-10-20&top_k=1')).status, 200);
    } finally {
        s.close();
        await c.shutdown();
    }
});

test('a cache name can only be registered once per application', () => {
    assert.throws(() => container.caches.create({ name: 'route' }), /already exists/);
});

test('request metrics are labelled by API resource, not "static"', async () => {
    await fetch(`${base}/api/schedule/abc`);                       // 400 answered inside the schedule router
    await fetch(`${base}/api/route?from=NDLS&to=CSMT&date=2026-10-20&top_k=1`);
    const text = await (await fetch(`${base}/metrics`)).text();
    assert.match(text, /railyatra_http_requests_total\{route="\/api\/schedule",status="400"\} \d+/);
    assert.match(text, /railyatra_http_requests_total\{route="\/api\/route",status="200"\} \d+/);
    assert.doesNotMatch(text, /route="static",status="400"/);
});

test('caches respect a byte budget, not just an entry count', () => {
    const { LruCache } = require('../src/platform/cache');
    const value = 'x'.repeat(98);                         // JSON-serialized: 100 bytes
    const c = new LruCache({ name: 'bytes', maxEntries: 1000, maxBytes: 350 });
    for (let i = 0; i < 10; i++) c.set(`k${i}`, value);
    assert.strictEqual(c.size, 3);                        // 3 x 100 <= 350 < 4 x 100
    assert.ok(c.bytes <= 350);
    assert.strictEqual(c.get('k0'), undefined);           // oldest evicted first
    assert.strictEqual(c.get('k9'), value);
    c.set('huge', 'y'.repeat(1000));                      // bigger than the whole budget
    assert.strictEqual(c.get('huge'), undefined);
    assert.strictEqual(c.size, 3);
    c.set('k9', 'z');                                     // replacing an entry re-accounts its size
    assert.strictEqual(c.bytes, 200 + 3);
    c.clear();
    assert.strictEqual(c.bytes, 0);
});

test('every response identifies the serving instance (for replica distribution checks)', async () => {
    const res = await fetch(`${base}/api/health`);
    const body = await res.json();
    assert.strictEqual(res.headers.get('x-instance-id'), container.config.instanceId);
    assert.strictEqual(body.instance, container.config.instanceId);
});

test('only successful cacheable responses are cacheable by CDNs; everything else is no-store', async () => {
    const cc = async (p) => (await fetch(base + p)).headers.get('cache-control');
    assert.match(await cc('/api/route?from=NDLS&to=CSMT&date=2026-10-20&top_k=1'), /^public/);
    assert.match(await cc('/api/stations?q=delhi'), /^public/);
    assert.match(await cc('/api/schedule/12138'), /^public/);
    assert.match(await cc('/api/category/vandebharat'), /^public/);
    for (const p of ['/api/health', '/readyz', '/healthz', '/metrics', '/api/livestatus/12138',
        '/api/route?from=NDLS', '/api/schedule/abc', '/api/schedule/99999', '/api/category/nope', '/api/nothing-here']) {
        assert.strictEqual(await cc(p), 'no-store', `${p} must not be cacheable`);
    }
});

test('index.html is never cached long-term, hashed assets are immutable', async (t) => {
    const dist = path.join(ROOT, 'frontend', 'dist');
    if (!fs.existsSync(dist)) return t.skip('frontend not built');
    const asset = fs.readdirSync(path.join(dist, 'assets')).find((f) => f.endsWith('.js'));
    const cc = async (p) => (await fetch(base + p)).headers.get('cache-control');
    assert.strictEqual(await cc('/'), 'no-cache');
    assert.strictEqual(await cc('/schedules'), 'no-cache');
    assert.match(await cc(`/assets/${asset}`), /max-age=31536000.*immutable/);
});
