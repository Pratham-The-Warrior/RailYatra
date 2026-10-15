/**
 * Rate limiting: token bucket behaviour, client keys, and the two HTTP layers
 * (per-client request limit; engine limit that applies only to cache misses).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');

const { TokenBucketLimiter, clientKey } = require('../src/platform/rateLimit');
const { createContainer } = require('../src/container');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/platform/config');

test('token bucket: burst, refill and retry-after', () => {
    let t = 1000;
    const l = new TokenBucketLimiter({ ratePerSec: 2, burst: 3, now: () => t });
    assert.ok(l.take('a').allowed);
    assert.ok(l.take('a').allowed);
    assert.ok(l.take('a').allowed);
    const denied = l.take('a');
    assert.strictEqual(denied.allowed, false);
    assert.strictEqual(denied.retryAfterSec, 1);
    assert.ok(l.take('b').allowed, 'clients are independent');
    t += 0.5;                                   // +1 token at 2/s
    assert.ok(l.take('a').allowed);
    assert.strictEqual(l.take('a').allowed, false);
    t += 100;                                   // refill is capped at burst
    for (let i = 0; i < 3; i++) assert.ok(l.take('a').allowed);
    assert.strictEqual(l.take('a').allowed, false);
});

test('token bucket: tracked clients are bounded (least recently seen evicted)', () => {
    const l = new TokenBucketLimiter({ ratePerSec: 1, burst: 1, maxClients: 100, now: () => 0 });
    for (let i = 0; i < 1000; i++) l.take(`ip${i}`);
    assert.strictEqual(l.size, 100);
});

test('client keys: IPv4, IPv4-mapped IPv6 and IPv6 /64', () => {
    assert.strictEqual(clientKey('203.0.113.7'), '203.0.113.7');
    assert.strictEqual(clientKey('::ffff:203.0.113.7'), '203.0.113.7');
    assert.strictEqual(clientKey('2001:db8:aa:bb:1:2:3:4'), '2001:db8:aa:bb::/64');
    assert.strictEqual(clientKey('2001:db8:aa:bb::99'), '2001:db8:aa:bb::/64');
    assert.strictEqual(clientKey('2001:db8::1'), '2001:db8:0:0::/64');
    assert.strictEqual(clientKey('2001:0db8:00aa:00bb::1'), '2001:db8:aa:bb::/64');
    assert.strictEqual(clientKey('::1'), '0:0:0:0::/64');
    assert.strictEqual(clientKey(undefined), 'unknown');
});

test('configuration validates the rate-limit settings', () => {
    assert.strictEqual(loadConfig({}).rateLimit.enabled, true);
    assert.strictEqual(loadConfig({ RATE_LIMIT_ENABLED: '0' }).rateLimit.enabled, false);
    assert.throws(() => loadConfig({ RATE_LIMIT_ENABLED: 'maybe' }), /RATE_LIMIT_ENABLED/);
    assert.throws(() => loadConfig({ RATE_LIMIT_RPS: '0' }), /RATE_LIMIT_RPS/);
    assert.throws(() => loadConfig({ TRUST_PROXY: '-1' }), /TRUST_PROXY/);
    assert.strictEqual(loadConfig({ TRUST_PROXY: '2' }).trustProxy, 2);
});

// HTTP behaviour with deliberately tiny limits.
const container = createContainer({
    env: {
        ...process.env, ENGINE_POOL_SIZE: '1',
        RATE_LIMIT_RPS: '1', RATE_LIMIT_BURST: '6',
        ENGINE_RATE_LIMIT_RPS: '1', ENGINE_RATE_LIMIT_BURST: '2'
    }
});
let server, base;

before(async () => {
    container.start();
    server = createApp(container).listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    for (let i = 0; i < 200 && !container.routing.isReady(); i++) await new Promise((r) => setTimeout(r, 50));
    assert.ok(container.routing.isReady());
});
after(async () => { await container.shutdown(); server.close(); });

// Each test uses its own client IP via X-Forwarded-For (TRUST_PROXY=1 trusts one hop).
const get = (path, ip) => fetch(base + path, { headers: { 'x-forwarded-for': ip } });

test('engine limit applies to cache misses only; cached searches stay available', async () => {
    const ip = '198.51.100.1';
    const route = (d) => `/api/route?from=NDLS&to=CSMT&date=2026-11-${d}&top_k=3`;   // 02,03,04 = Mon,Tue,Wed
    assert.strictEqual((await get(route('02'), ip)).status, 200);   // miss 1
    assert.strictEqual((await get(route('03'), ip)).status, 200);   // miss 2 (burst 2 used)
    const limited = await get(route('04'), ip);                      // miss 3 -> limited
    assert.strictEqual(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) >= 1);
    assert.strictEqual(limited.headers.get('cache-control'), 'no-store');
    assert.match((await limited.json()).error, /retry/i);
    assert.strictEqual((await get(route('02'), ip)).status, 200, 'cached search must not be throttled');
    assert.strictEqual((await get(route('04'), '198.51.100.2')).status, 200, 'other clients unaffected');
});

test('request limit applies to every API call per client; health checks are exempt', async () => {
    const ip = '198.51.100.3';
    const statuses = [];
    for (let i = 0; i < 9; i++) statuses.push((await get('/api/stations?q=delhi', ip)).status);
    assert.ok(statuses.slice(0, 6).every((s) => s === 200), `burst of 6 allowed: ${statuses}`);
    assert.ok(statuses.slice(6).includes(429), `then limited: ${statuses}`);
    for (let i = 0; i < 10; i++) {
        assert.strictEqual((await get('/api/health', ip)).status, 200);
        assert.strictEqual((await get('/readyz', ip)).status, 200);
    }
    const metrics = await (await fetch(base + '/metrics')).text();
    assert.match(metrics, /railyatra_rate_limited_total\{limit="requests"\} \d+/);
    assert.match(metrics, /railyatra_rate_limited_total\{limit="engine"\} \d+/);
    assert.match(metrics, /railyatra_http_requests_total\{route="\/api\/stations",status="429"\} \d+/);
});

test('rate limiting can be disabled', async () => {
    const c = createContainer({ env: { ...process.env, ENGINE_POOL_SIZE: '1', RATE_LIMIT_ENABLED: '0', RATE_LIMIT_BURST: '1' } });
    c.start();
    const s = createApp(c).listen(0);
    try {
        const url = `http://127.0.0.1:${s.address().port}/api/stations?q=pune`;
        for (let i = 0; i < 20; i++) assert.strictEqual((await fetch(url)).status, 200);
    } finally {
        s.close();
        await c.shutdown();
    }
});
