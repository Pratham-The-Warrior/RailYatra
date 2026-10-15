const metrics = require('./metrics');

/**
 * In-process LRU cache with TTL and request coalescing (the CachePort).
 *
 * Train timetables change rarely, so route/schedule results are highly
 * cacheable. `getOrCompute` also coalesces concurrent identical misses into a
 * single computation (prevents a thundering herd on popular routes).
 *
 * A shared store (e.g. Redis) can implement the same three methods
 * (get, set, getOrCompute, clear) and be returned by CacheRegistry.create
 * without changing any feature module.
 */
class LruCache {
    /**
     * @param {object} o
     * @param {string} o.name
     * @param {number} [o.maxEntries]  entry limit
     * @param {number} [o.maxBytes]    memory budget (serialized JSON size); bounds
     *                                 memory regardless of how large values are
     * @param {number} [o.ttlMs]
     */
    constructor({ name, maxEntries = 10000, maxBytes = Infinity, ttlMs = 10 * 60 * 1000 }) {
        this.name = name;
        this.maxEntries = maxEntries;
        this.maxBytes = maxBytes;
        this.ttlMs = ttlMs;
        this.bytes = 0;
        this.map = new Map();
        this.inflight = new Map();
        // Bumped by clear(); a computation that started under an older
        // generation must not write its (stale) result into the cache.
        this.generation = 0;
    }

    clear() {
        this.map.clear();
        this.inflight.clear();
        this.bytes = 0;
        this.generation++;
    }

    _delete(key) {
        const entry = this.map.get(key);
        if (!entry) return;
        this.bytes -= entry.size;
        this.map.delete(key);
    }

    get(key) {
        const hit = this.map.get(key);
        if (!hit) return undefined;
        if (hit.expires < Date.now()) {
            this._delete(key);
            return undefined;
        }
        // Refresh recency
        this.map.delete(key);
        this.map.set(key, hit);
        return hit.value;
    }

    set(key, value) {
        if (this.maxEntries <= 0) return;
        const size = Number.isFinite(this.maxBytes) ? Buffer.byteLength(JSON.stringify(value) || '') : 0;
        this._delete(key);
        if (size > this.maxBytes) return;          // larger than the whole budget: don't cache
        this.map.set(key, { value, expires: Date.now() + this.ttlMs, size });
        this.bytes += size;
        while (this.map.size > this.maxEntries || this.bytes > this.maxBytes) {
            this._delete(this.map.keys().next().value);
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

/** Owns every cache of one application instance so a data reload can clear them all. */
class CacheRegistry {
    constructor() {
        this.caches = new Map();
    }

    create(options) {
        if (this.caches.has(options.name)) throw new Error(`Cache "${options.name}" already exists`);
        const cache = new LruCache(options);
        this.caches.set(options.name, cache);
        metrics.gauge('cache_bytes', { cache: options.name }, () => cache.bytes);
        metrics.gauge('cache_entries', { cache: options.name }, () => cache.size);
        return cache;
    }

    get(name) {
        return this.caches.get(name);
    }

    clearAll() {
        for (const cache of this.caches.values()) cache.clear();
    }
}

module.exports = { LruCache, CacheRegistry };
