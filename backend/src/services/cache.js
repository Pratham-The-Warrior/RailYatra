const metrics = require('./metrics');

/**
 * In-process LRU cache with TTL and request coalescing.
 *
 * Train timetables change rarely, so route/schedule results are highly
 * cacheable. `getOrCompute` also coalesces concurrent identical misses into a
 * single engine call (prevents a thundering herd on popular routes).
 */
class LruCache {
    constructor({ name, maxEntries = 10000, ttlMs = 10 * 60 * 1000 }) {
        this.name = name;
        this.maxEntries = maxEntries;
        this.ttlMs = ttlMs;
        this.map = new Map();
        this.inflight = new Map();
    }

    get(key) {
        const hit = this.map.get(key);
        if (!hit) return undefined;
        if (hit.expires < Date.now()) {
            this.map.delete(key);
            return undefined;
        }
        // Refresh recency
        this.map.delete(key);
        this.map.set(key, hit);
        return hit.value;
    }

    set(key, value) {
        if (this.map.has(key)) this.map.delete(key);
        this.map.set(key, { value, expires: Date.now() + this.ttlMs });
        while (this.map.size > this.maxEntries) {
            this.map.delete(this.map.keys().next().value);
        }
    }

    async getOrCompute(key, compute) {
        const cached = this.get(key);
        if (cached !== undefined) {
            metrics.inc('cache_hits_total', { cache: this.name });
            return cached;
        }
        const running = this.inflight.get(key);
        if (running) {
            metrics.inc('cache_coalesced_total', { cache: this.name });
            return running;
        }
        metrics.inc('cache_misses_total', { cache: this.name });
        const p = (async () => {
            try {
                const value = await compute();
                this.set(key, value);
                return value;
            } finally {
                this.inflight.delete(key);
            }
        })();
        this.inflight.set(key, p);
        return p;
    }

    get size() { return this.map.size; }
}

module.exports = { LruCache };
