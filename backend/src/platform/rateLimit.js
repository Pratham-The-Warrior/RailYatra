const net = require('net');

/**
 * Per-client rate limiting with token buckets.
 *
 * Each client key gets `burst` tokens, refilled at `ratePerSec`. A request
 * spends one token; with none left it is refused with a Retry-After hint.
 * State is in memory per instance (so the effective fleet-wide limit is
 * per-instance limit x replicas); the number of tracked clients is bounded
 * (least recently seen are evicted) so a spray of fake addresses cannot
 * exhaust memory.
 */
class TokenBucketLimiter {
    constructor({ ratePerSec, burst, maxClients = 100000, now = () => Date.now() / 1000 }) {
        if (!(ratePerSec > 0) || !(burst >= 1)) throw new Error('ratePerSec must be > 0 and burst >= 1');
        this.ratePerSec = ratePerSec;
        this.burst = burst;
        this.maxClients = maxClients;
        this.now = now;
        this.buckets = new Map();   // key -> { tokens, last }; insertion order = recency
    }

    /** Spends one token for `key`. Returns { allowed, retryAfterSec }. */
    take(key) {
        const t = this.now();
        let b = this.buckets.get(key);
        if (b) {
            this.buckets.delete(key);    // re-inserted below as most recent
            b.tokens = Math.min(this.burst, b.tokens + (t - b.last) * this.ratePerSec);
            b.last = t;
        } else {
            b = { tokens: this.burst, last: t };
        }
        this.buckets.set(key, b);
        if (this.buckets.size > this.maxClients) this.buckets.delete(this.buckets.keys().next().value);

        if (b.tokens >= 1) {
            b.tokens -= 1;
            return { allowed: true, retryAfterSec: 0 };
        }
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((1 - b.tokens) / this.ratePerSec)) };
    }

    get size() { return this.buckets.size; }
}

/**
 * Normalizes a client address into a rate-limit key:
 *   IPv4-mapped IPv6 ("::ffff:1.2.3.4") -> "1.2.3.4"
 *   IPv6 -> its /64 prefix (one subscriber usually controls a whole /64)
 */
function clientKey(ip) {
    if (typeof ip !== 'string' || ip === '') return 'unknown';
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
    if (mapped) return mapped[1];
    if (!net.isIPv6(ip)) return ip;
    const [head, tail = ''] = ip.split('::');
    const left = head ? head.split(':') : [];
    const right = tail ? tail.split(':') : [];
    const groups = ip.includes('::')
        ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
        : left;
    return groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(':') + '::/64';
}

/** Sends the standard 429 response. */
function tooMany(res, retryAfterSec, message) {
    res.set('Retry-After', String(retryAfterSec));
    res.status(429).json({ error: message });
}

/**
 * Express middleware limiting every request of a client. `skip(req)` exempts
 * requests (e.g. health checks).
 */
function rateLimitMiddleware({ limiter, metrics, name, skip = () => false }) {
    return (req, res, next) => {
        if (skip(req)) return next();
        const r = limiter.take(clientKey(req.ip));
        if (r.allowed) return next();
        metrics.inc('rate_limited_total', { limit: name });
        tooMany(res, r.retryAfterSec, 'Too many requests, please slow down.');
    };
}

/**
 * Gate for expensive work (engine calls on cache misses). Returns true if the
 * request may proceed; otherwise sends 429 and returns false. A null limiter
 * (rate limiting disabled) always allows.
 */
function createEngineGate({ limiter, metrics }) {
    return (req, res) => {
        if (!limiter) return true;
        const r = limiter.take(clientKey(req.ip));
        if (r.allowed) return true;
        metrics.inc('rate_limited_total', { limit: 'engine' });
        tooMany(res, r.retryAfterSec, 'Too many new searches from your network, please retry shortly.');
        return false;
    };
}

module.exports = { TokenBucketLimiter, clientKey, rateLimitMiddleware, createEngineGate };
