const express = require('express');
const { badRequest } = require('../../platform/errors');
const { weekdayOf, clamp } = require('../../platform/validation');
const { resolveStationCodes } = require('./stationResolver');

/**
 * Journey search: ranked route list (GET/POST /api/route) and best trade-offs
 * (GET /api/route/pareto). Results are cached by weekday: the engine reads
 * only the day of week from the date, so this is exact.
 */
function createRouter({ config, routing, caches, referenceData, engineGate }) {
    const router = express.Router();
    const routeCache = caches.create({
        name: 'route',
        maxEntries: config.routeCacheSize,
        maxBytes: config.routeCacheMaxMb * 1024 * 1024,
        ttlMs: config.routeCacheTtlMs
    });
    const { limits } = config;

    function parseInput(input) {
        const { from, to, date, max_switches, max_wait, sort_by, top_k } = input || {};
        if (!from || !to || !date) throw badRequest('Missing required fields: from, to, date');

        const weekday = weekdayOf(date);
        if (weekday === -1) throw badRequest('Invalid date, expected YYYY-MM-DD');

        const { cities } = referenceData.current();
        const fromCodes = resolveStationCodes(from, cities, limits.maxCityStations);
        const toCodes = resolveStationCodes(to, cities, limits.maxCityStations);
        if (fromCodes.length === 0) throw badRequest('Unknown source city or station');
        if (toCodes.length === 0) throw badRequest('Unknown destination city or station');

        return {
            fromCodes, toCodes, date, weekday,
            maxSwitches: clamp(max_switches, 0, limits.maxSwitches, 5),
            maxWait: clamp(max_wait, 30, limits.maxWaitMin, 600),
            sortBy: ['time', 'distance', 'switches'].includes(sort_by) ? sort_by : 'switches',
            topK: clamp(top_k, 1, limits.maxTopK, 10)
        };
    }

    /**
     * Runs an engine request through the cache and writes the response.
     * Deterministic engine input errors are cached too (as { __error }).
     */
    async function respondCached(req, res, cacheKey, payload) {
        // Only cache misses cost engine time, so only they count against the
        // per-client engine limit; popular (cached) searches are never throttled.
        if (routeCache.get(cacheKey) === undefined && !engineGate(req, res)) return;
        try {
            const results = await routeCache.getOrCompute(cacheKey, async () => {
                const r = await routing.request(payload);
                return r && r.error ? { __error: r.error } : r;
            });
            if (results && results.__error) {
                return res.status(400).json({ error: results.__error });
            }
            res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
            res.json(results);
        } catch (e) {
            res.status(e.status || 500).json({ error: e.message });
        }
    }

    // GET (query string) is CDN-cacheable by URL; POST (JSON body) kept for compatibility.
    const inputOf = (req) => (req.method === 'GET' ? req.query : req.body) || {};

    async function searchRoute(req, res) {
        const q = parseInput(inputOf(req));
        const isMulti = q.fromCodes.length > 1 || q.toCodes.length > 1;
        const payload = {
            type: isMulti ? 'multi_route' : 'route',
            from: isMulti ? q.fromCodes : q.fromCodes[0],
            to: isMulti ? q.toCodes : q.toCodes[0],
            date: q.date,
            max_switches: q.maxSwitches,
            max_wait: q.maxWait,
            sort_by: q.sortBy,
            top_k: q.topK
        };
        const cacheKey = JSON.stringify([payload.type, payload.from, payload.to, q.weekday,
            payload.max_switches, payload.max_wait, payload.sort_by, payload.top_k]);
        return respondCached(req, res, cacheKey, payload);
    }

    async function paretoRoute(req, res) {
        const q = parseInput(inputOf(req));
        const payload = {
            type: 'pareto',
            from: q.fromCodes,
            to: q.toCodes,
            date: q.date,
            max_switches: q.maxSwitches,
            max_wait: q.maxWait
        };
        const cacheKey = JSON.stringify(['pareto', q.fromCodes, q.toCodes, q.weekday, q.maxSwitches, q.maxWait]);
        return respondCached(req, res, cacheKey, payload);
    }

    router.get('/pareto', paretoRoute);
    router.get('/', searchRoute);
    router.post('/', searchRoute);
    return router;
}

module.exports = { name: 'journeys', mountPath: '/api/route', createRouter };
