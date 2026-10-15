/**
 * Samples /api/health and reports how requests spread across instances
 * (X-Instance-Id). Proves a multi-replica deployment really load-balances.
 *
 *   node probe-instances.js <base-url> [samples=60] [--min-instances n]
 */
async function probe(baseUrl, samples) {
    const counts = {};
    for (let i = 0; i < samples; i++) {
        // A fresh connection per sample, so connection reuse cannot pin us to one replica.
        const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/health`, { headers: { connection: 'close' }, cache: 'no-store' });
        const id = res.headers.get('x-instance-id') || 'unknown';
        counts[id] = (counts[id] || 0) + 1;
        await res.arrayBuffer();
    }
    return counts;
}

async function main(argv) {
    const [baseUrl, samplesArg] = argv;
    const samples = Number(samplesArg && !samplesArg.startsWith('--') ? samplesArg : 60);
    const i = argv.indexOf('--min-instances');
    const minInstances = i === -1 ? 1 : Number(argv[i + 1]);
    const counts = await probe(baseUrl, samples);
    const distinct = Object.keys(counts).filter((k) => k !== 'unknown').length;
    console.log(`Instances seen in ${samples} requests: ${distinct}`);
    for (const [id, n] of Object.entries(counts)) console.log(`  ${id}: ${n}`);
    if (distinct < minInstances) {
        console.error(`Expected at least ${minInstances} instances behind ${baseUrl}`);
        return 1;
    }
    return 0;
}

if (require.main === module) main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { console.error(e.message); process.exitCode = 2; });

module.exports = { probe };
