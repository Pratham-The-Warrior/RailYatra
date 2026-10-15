/**
 * Combines the JSON summaries of several load-test runners (run.js --json)
 * into one verdict for a distributed test.
 *
 *   node aggregate.js <dir-with-json-files> [--max-p99 ms] [--max-error-pct n]
 *                     [--max-shed-pct n] [--min-rps n] [--markdown out.md]
 *
 * Latency: runners report their own percentiles, which cannot be merged
 * exactly. The maximum of the runners' p99 values is a valid UPPER BOUND on
 * the combined p99: if every runner had >= 99% of its requests at or below its
 * own p99, then >= 99% of all requests are at or below the largest one.
 *
 * Errors vs shedding: 503 responses are load shedding (the service protecting
 * itself), reported separately from real failures (connection errors,
 * timeouts and every other non-2xx status).
 */
const fs = require('fs');
const path = require('path');

function aggregate(summaries) {
    if (summaries.length === 0) throw new Error('no runner results to aggregate');
    const sum = (f) => summaries.reduce((acc, s) => acc + (Number(f(s)) || 0), 0);
    const statusCodes = {};
    for (const s of summaries) {
        for (const [code, n] of Object.entries(s.status_codes || {})) statusCodes[code] = (statusCodes[code] || 0) + n;
    }
    const total = sum((s) => s.total);
    const shed = statusCodes['503'] || 0;
    const otherNon2xx = Object.entries(statusCodes)
        .filter(([code]) => !code.startsWith('2') && code !== '503')
        .reduce((acc, [, n]) => acc + n, 0);
    const failures = sum((s) => s.errors) + sum((s) => s.timeouts) + otherNon2xx;
    return {
        runners: summaries.length,
        total_requests: total,
        rps_total: Math.round(sum((s) => s.rps_avg)),
        latency_p50_ms_upper_bound: Math.max(...summaries.map((s) => s.latency_p50_ms)),
        latency_p99_ms_upper_bound: Math.max(...summaries.map((s) => s.latency_p99_ms)),
        status_codes: statusCodes,
        shed_503: shed,
        failures,
        error_pct: total ? (100 * failures) / total : 0,
        shed_pct: total ? (100 * shed) / total : 0
    };
}

function verdict(agg, limits) {
    const problems = [];
    if (limits.maxP99 !== undefined && agg.latency_p99_ms_upper_bound > limits.maxP99) {
        problems.push(`p99 upper bound ${agg.latency_p99_ms_upper_bound} ms > ${limits.maxP99} ms`);
    }
    if (limits.maxErrorPct !== undefined && agg.error_pct > limits.maxErrorPct) {
        problems.push(`error rate ${agg.error_pct.toFixed(3)}% > ${limits.maxErrorPct}%`);
    }
    if (limits.maxShedPct !== undefined && agg.shed_pct > limits.maxShedPct) {
        problems.push(`shed rate ${agg.shed_pct.toFixed(3)}% > ${limits.maxShedPct}%`);
    }
    if (limits.minRps !== undefined && agg.rps_total < limits.minRps) {
        problems.push(`throughput ${agg.rps_total} req/s < ${limits.minRps} req/s`);
    }
    return problems;
}

function markdown(agg, problems, limits) {
    const rows = [
        ['Runners', agg.runners],
        ['Total requests', agg.total_requests],
        ['Throughput (sum of runners)', `${agg.rps_total} req/s`],
        ['p50 (upper bound)', `${agg.latency_p50_ms_upper_bound} ms`],
        ['p99 (upper bound)', `${agg.latency_p99_ms_upper_bound} ms`],
        ['Failures (errors, timeouts, non-2xx except 503)', `${agg.failures} (${agg.error_pct.toFixed(3)}%)`],
        ['Shed with 503', `${agg.shed_503} (${agg.shed_pct.toFixed(3)}%)`],
        ['Status codes', Object.entries(agg.status_codes).map(([c, n]) => `${c}: ${n}`).join(', ')]
    ];
    const lim = Object.entries(limits).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join(', ') || 'none';
    return [
        `## Distributed load test: ${problems.length ? 'FAILED' : 'PASSED'}`,
        '',
        '| Measure | Value |', '|---|---|',
        ...rows.map(([k, v]) => `| ${k} | ${v} |`),
        '',
        `Limits: ${lim}`,
        ...(problems.length ? ['', ...problems.map((p) => `- ${p}`)] : [])
    ].join('\n') + '\n';
}

function main(argv) {
    const dir = argv[0];
    const opt = (name) => {
        const i = argv.indexOf(`--${name}`);
        return i === -1 ? undefined : argv[i + 1];
    };
    const num = (name) => (opt(name) === undefined ? undefined : Number(opt(name)));
    const files = fs.readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith('.json'));
    const summaries = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    const agg = aggregate(summaries);
    const limits = { maxP99: num('max-p99'), maxErrorPct: num('max-error-pct'), maxShedPct: num('max-shed-pct'), minRps: num('min-rps') };
    const problems = verdict(agg, limits);
    const md = markdown(agg, problems, limits);
    if (opt('markdown')) fs.writeFileSync(opt('markdown'), md);
    console.log(md);
    console.log(JSON.stringify(agg, null, 2));
    return problems.length ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { aggregate, verdict, markdown };
