/**
 * RailYatra load-test harness.
 *
 * Usage: node run.js <scenario> [--url http://localhost:3000] [--connections 100]
 *                    [--duration 20] [--zipf 1.1] [--json out.json]
 *                    [--max-p99 <ms>] [--min-rps <n>]
 *
 * Exits non-zero if any request errors, any non-2xx response, or a threshold
 * is violated, so it can be used as a CI performance gate.
 *
 * Scenarios
 *   route  – POST /api/route only, random station pairs and dates (cache-hostile
 *            when --zipf 0, realistic popularity skew with --zipf > 0).
 *   mixed  – realistic traffic mix: 60% station autocomplete, 25% route search,
 *            10% schedule lookup, 5% category listing.
 *   pareto – GET /api/route/pareto only (best trade-offs), same pair/date mix as route.
 */
const autocannon = require('autocannon');

const args = Object.fromEntries(process.argv.slice(3).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
}, []));
const scenario = process.argv[2] || 'route';
const url = args.url || 'http://localhost:3000';
const connections = Number(args.connections || 100);
const duration = Number(args.duration || 20);
const zipfS = Number(args.zipf ?? 1.1);

// Busiest junctions in master_train_data.json, ordered by stop count.
const STATIONS = ['BZA', 'ET', 'CNB', 'BSL', 'KYN', 'DDU', 'NGP', 'VGLJ', 'HWH', 'BBS', 'LKO',
    'NDLS', 'KUR', 'ST', 'KGP', 'BPL', 'BRC', 'PUNE', 'MMR', 'ASN', 'VSKP', 'RJY', 'NZM', 'KPD',
    'UMB', 'MB', 'CTC', 'GZB', 'TNA', 'BSB', 'MTJ', 'VZM', 'TCR', 'ADI', 'PRYJ', 'JBP', 'SA',
    'OGL', 'BLS', 'RTM', 'CSMT', 'KOP', 'MAS', 'SBC'];
const QUERIES = ['del', 'mumb', 'kolk', 'chen', 'bang', 'pune', 'hyde', 'ahme', 'jaip', 'luck',
    'patn', 'bhop', 'nagp', 'vija', 'kanp', 'agra', 'sura', 'indo', 'gwal', 'howr'];
const TRAINS = ['12138', '12809', '12147', '11039', '12859', '12833', '11030', '12290', '12262', '11078'];
const CITIES = ['CITY:MUMBAI', 'CITY:DELHI', 'CITY:KOLKATA', 'CITY:CHENNAI', 'CITY:BENGALURU'];

// Zipf sampler: popular items requested far more often, like real traffic.
function zipfSampler(n, s) {
    if (!s) return () => Math.floor(Math.random() * n);
    const w = Array.from({ length: n }, (_, i) => 1 / Math.pow(i + 1, s));
    const total = w.reduce((a, b) => a + b, 0);
    const cdf = []; let acc = 0;
    for (const x of w) { acc += x / total; cdf.push(acc); }
    return () => { const r = Math.random(); let lo = 0, hi = n - 1;
        while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < r) lo = m + 1; else hi = m; } return lo; };
}
const pickStation = zipfSampler(STATIONS.length, zipfS);
const pickDay = zipfSampler(30, zipfS);
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function dateIn(days) {
    const d = new Date(Date.UTC(2026, 10, 1) + days * 86400000);
    return d.toISOString().slice(0, 10);
}

function routeRequest() {
    let from = STATIONS[pickStation()], to = STATIONS[pickStation()];
    while (to === from) to = rand(STATIONS);
    if (Math.random() < 0.05) { from = rand(CITIES); to = rand(CITIES.filter(c => c !== from)); }
    return {
        method: 'POST', path: '/api/route',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ from, to, date: dateIn(pickDay()), max_switches: 5, max_wait: 600, sort_by: 'switches', top_k: 50 })
    };
}

function paretoRequest() {
    const { body } = routeRequest();
    const p = JSON.parse(body);
    const qs = new URLSearchParams({ from: p.from, to: p.to, date: p.date, max_switches: '5', max_wait: '600' });
    return { method: 'GET', path: `/api/route/pareto?${qs}` };
}

function mixedRequest() {
    const r = Math.random();
    if (r < 0.60) return { method: 'GET', path: `/api/stations?q=${rand(QUERIES)}` };
    if (r < 0.85) return routeRequest();
    if (r < 0.95) return { method: 'GET', path: `/api/schedule/${rand(TRAINS)}` };
    return { method: 'GET', path: '/api/category/vandebharat' };
}

const instance = autocannon({
    url, connections, duration,
    requests: [{ setupRequest: (req) => ({ ...req, ...(scenario === 'mixed' ? mixedRequest() : scenario === 'pareto' ? paretoRequest() : routeRequest()) }) }]
}, (err, res) => {
    if (err) { console.error(err); process.exit(1); }
    const summary = {
        scenario, connections, duration, zipf: zipfS,
        rps_avg: res.requests.average, rps_p50: res.requests.p50,
        latency_p50_ms: res.latency.p50, latency_p90_ms: res.latency.p90,
        latency_p99_ms: res.latency.p99, latency_max_ms: res.latency.max,
        total: res.requests.total, non2xx: res.non2xx, errors: res.errors, timeouts: res.timeouts
    };
    console.log(JSON.stringify(summary, null, 2));
    if (args.json) require('fs').writeFileSync(args.json, JSON.stringify(summary, null, 2));

    const failures = [];
    if (res.errors || res.timeouts) failures.push(`${res.errors} errors, ${res.timeouts} timeouts`);
    if (res.non2xx) failures.push(`${res.non2xx} non-2xx responses`);
    if (args['max-p99'] && res.latency.p99 > Number(args['max-p99'])) failures.push(`p99 ${res.latency.p99}ms > ${args['max-p99']}ms`);
    if (args['min-rps'] && res.requests.average < Number(args['min-rps'])) failures.push(`rps ${res.requests.average} < ${args['min-rps']}`);
    if (failures.length) {
        console.error('LOAD TEST FAILED: ' + failures.join('; '));
        process.exit(1);
    }
});
autocannon.track(instance, { renderProgressBar: false, renderResultsTable: false });
