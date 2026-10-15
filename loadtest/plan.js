/**
 * Plans a distributed load test (used by .github/workflows/loadtest.yml).
 * Validates inputs and prints GitHub Actions outputs:
 *   runners=[1,2,...]  per_runner_rate=N  start_at=<epoch seconds>
 * All runners sleep until start_at so their load actually overlaps.
 */
function plan({ url, totalRate, runners, startDelaySeconds = 120, now = Date.now() }) {
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error(`invalid url: ${url}`); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('url must be http(s)');
    const n = Number(runners);
    const rate = Number(totalRate);
    if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error('runners must be an integer between 1 and 20');
    if (!Number.isFinite(rate) || rate < n) throw new Error('total_rate must be a number >= runners');
    return {
        runners: Array.from({ length: n }, (_, i) => i + 1),
        per_runner_rate: Math.floor(rate / n),
        start_at: Math.ceil(now / 1000) + startDelaySeconds
    };
}

if (require.main === module) {
    const env = process.env;
    const p = plan({ url: env.TARGET_URL, totalRate: env.TOTAL_RATE, runners: env.RUNNERS });
    const out = `runners=${JSON.stringify(p.runners)}\nper_runner_rate=${p.per_runner_rate}\nstart_at=${p.start_at}\n`;
    if (env.GITHUB_OUTPUT) require('fs').appendFileSync(env.GITHUB_OUTPUT, out);
    process.stdout.write(out);
}

module.exports = { plan };
