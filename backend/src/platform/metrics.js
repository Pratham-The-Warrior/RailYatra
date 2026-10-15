/**
 * Minimal dependency-free Prometheus metrics registry.
 * Counters and fixed-bucket histograms, exposed at GET /metrics.
 */
const counters = new Map();
const gauges = new Map();   // key -> () => number, evaluated at scrape time
const histograms = new Map();
const BUCKETS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

function key(name, labels) {
    if (!labels) return name;
    const parts = Object.keys(labels).sort().map(k => `${k}="${String(labels[k]).replace(/"/g, '')}"`);
    return `${name}{${parts.join(',')}}`;
}

function inc(name, labels, by = 1) {
    const k = key(name, labels);
    counters.set(k, (counters.get(k) || 0) + by);
}

function observe(name, value, labels) {
    const k = key(name, labels);
    let h = histograms.get(k);
    if (!h) {
        h = { name, labels, counts: new Array(BUCKETS.length).fill(0), sum: 0, count: 0 };
        histograms.set(k, h);
    }
    for (let i = 0; i < BUCKETS.length; i++) if (value <= BUCKETS[i]) h.counts[i]++;
    h.sum += value;
    h.count++;
}

/** Registers a gauge whose value is read when /metrics is scraped. */
function gauge(name, labels, read) {
    gauges.set(key(name, labels), read);
}

function render() {
    const lines = [];
    for (const [k, read] of gauges) lines.push(`railyatra_${k} ${read()}`);
    for (const [k, v] of counters) lines.push(`railyatra_${k} ${v}`);
    for (const h of histograms.values()) {
        const base = h.labels ? Object.entries(h.labels).map(([a, b]) => `${a}="${b}",`).join('') : '';
        BUCKETS.forEach((b, i) => lines.push(`railyatra_${h.name}_bucket{${base}le="${b}"} ${h.counts[i]}`));
        lines.push(`railyatra_${h.name}_bucket{${base}le="+Inf"} ${h.count}`);
        const suffix = h.labels ? `{${base.slice(0, -1)}}` : '';
        lines.push(`railyatra_${h.name}_sum${suffix} ${h.sum}`);
        lines.push(`railyatra_${h.name}_count${suffix} ${h.count}`);
    }
    const mem = process.memoryUsage();
    lines.push(`railyatra_process_rss_bytes ${mem.rss}`);
    lines.push(`railyatra_process_uptime_seconds ${process.uptime()}`);
    return lines.join('\n') + '\n';
}

module.exports = { inc, observe, gauge, render };
