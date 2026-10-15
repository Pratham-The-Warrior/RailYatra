const { test } = require('node:test');
const assert = require('node:assert');
const { aggregate, verdict } = require('../aggregate');

const runner = (o) => ({ rps_avg: 1000, total: 10000, latency_p50_ms: 5, latency_p99_ms: 100,
    errors: 0, timeouts: 0, status_codes: { 200: 10000 }, ...o });

test('sums throughput and requests across runners', () => {
    const a = aggregate([runner({}), runner({ rps_avg: 500, total: 5000, status_codes: { 200: 5000 } })]);
    assert.strictEqual(a.runners, 2);
    assert.strictEqual(a.rps_total, 1500);
    assert.strictEqual(a.total_requests, 15000);
    assert.deepStrictEqual(a.status_codes, { 200: 15000 });
});

test('combined p99 is the max runner p99 (a valid upper bound)', () => {
    const a = aggregate([runner({ latency_p99_ms: 80 }), runner({ latency_p99_ms: 240 }), runner({ latency_p99_ms: 120 })]);
    assert.strictEqual(a.latency_p99_ms_upper_bound, 240);
});

test('503 shedding is separated from real failures', () => {
    const a = aggregate([runner({ errors: 3, timeouts: 2, status_codes: { 200: 9890, 503: 100, 500: 5, 404: 5 } })]);
    assert.strictEqual(a.shed_503, 100);
    assert.strictEqual(a.failures, 3 + 2 + 5 + 5);
    assert.strictEqual(a.error_pct, 0.15);
    assert.strictEqual(a.shed_pct, 1);
});

test('verdict reports every violated limit and passes when within limits', () => {
    const a = aggregate([runner({ latency_p99_ms: 400, errors: 50 })]);
    const problems = verdict(a, { maxP99: 300, maxErrorPct: 0.1, minRps: 2000 });
    assert.strictEqual(problems.length, 3);
    assert.deepStrictEqual(verdict(aggregate([runner({})]), { maxP99: 300, maxErrorPct: 0.1, minRps: 900 }), []);
});

test('refuses to aggregate nothing', () => {
    assert.throws(() => aggregate([]), /no runner results/);
});

const { plan } = require('../plan');

test('plan splits the rate across runners and validates inputs', () => {
    const p = plan({ url: 'https://staging.example.com', totalRate: '3000', runners: '4', now: 1_000_000 });
    assert.deepStrictEqual(p.runners, [1, 2, 3, 4]);
    assert.strictEqual(p.per_runner_rate, 750);
    assert.strictEqual(p.start_at, 1000 + 120);
    assert.throws(() => plan({ url: 'ftp://x', totalRate: 10, runners: 1 }), /http/);
    assert.throws(() => plan({ url: 'not a url', totalRate: 10, runners: 1 }), /invalid url/);
    assert.throws(() => plan({ url: 'https://x.io', totalRate: 10, runners: 21 }), /between 1 and 20/);
    assert.throws(() => plan({ url: 'https://x.io', totalRate: 2, runners: 3 }), /total_rate/);
});
