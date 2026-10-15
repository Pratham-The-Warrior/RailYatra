const metrics = require('./metrics');

// Every cache registers itself so a timetable reload can invalidate them all.
const registry = new Set();

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
        // Bumped by clear(); a computation that started under an older
        // generation must not write its (stale) result into the cache.
        this.generation = 0;
        registry.add(this);
    }

    clear() {
        this.map.clear();
        this.inflight.clear();
        this.generation++;
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
        const generation = this.generation;
        // compute() runs on a later tick, so `p` is registered before it can
        // settle, even if compute throws synchronously.
        const p = Promise.resolve()
            .then(compute)
            .then((value) => {
                if (generation === this.generation) this.set(key, value);
                return value;
            })
            .finally(() => {
                if (this.inflight.get(key) === p) this.inflight.delete(key);
            });
        this.inflight.set(key, p);
        return p;
    }

    get size() { return this.map.size; }
}

function clearAll() {
    for (const c of registry) c.clear();
}

module.exports = { LruCache, clearAll };
