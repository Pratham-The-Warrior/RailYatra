const fs = require('fs');
const path = require('path');
const config = require('../../config');
const engine = require('../../services/engine.service');
const { LruCache } = require('../../services/cache');
const log = require('../../services/logger');

let cityStationsData = null;

/**
 * Loads the city-to-stations mapping (cached after first load).
 */
function getCityStations() {
    if (cityStationsData) return cityStationsData;
    try {
        const cityPath = path.join(config.projectRoot, 'city_stations.json');
        cityStationsData = JSON.parse(fs.readFileSync(cityPath, 'utf8'));
    } catch (e) {
        log.error('failed to load city_stations.json', { err: e.message });
        cityStationsData = {};
    }
    return cityStationsData;
}

/**
 * Route results only depend on the query's day of week (the engine reads
 * nothing else from the date), so caching by weekday instead of the full date
 * is exact and gives ~7x fewer distinct keys.
 */
const routeCache = new LruCache({
    name: 'route',
    maxEntries: config.routeCacheSize,
    ttlMs: config.routeCacheTtlMs
});

const STATION_CODE = /^[A-Z0-9]{1,8}$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Resolves a station code (or CITY:KEY) to an array of station codes.
 * Regular station code "CSMT" → ["CSMT"]
 * City prefix "CITY:MUMBAI" → ["CSMT", "BCT", "LTT", "DR", ...]
 */
function resolveStationCodes(input) {
    if (typeof input !== 'string') return [];
    if (input.startsWith('CITY:')) {
        const cityData = getCityStations();
        const city = cityData[input.substring(5)];
        return city ? city.stations.slice(0, config.limits.maxCityStations) : [];
    }
    // Regular station code — extract code from display format if needed
    const match = input.match(/\(([A-Z0-9]+)\)$/);
    const code = (match ? match[1] : input).trim().toUpperCase();
    return STATION_CODE.test(code) ? [code] : [];
}

function weekdayOf(date) {
    const m = DATE.exec(date || '');
    if (!m) return -1;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCMonth() !== +m[2] - 1) return -1; // rejects 2026-02-31 etc.
    return d.getUTCDay();
}

const clamp = (v, lo, hi, dflt) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

/**
 * Validates and normalizes route-search input shared by the list and pareto
 * endpoints. Returns { error } or the normalized fields.
 */
function parseRouteInput(input) {
    const { from, to, date, max_switches, max_wait, sort_by, top_k } = input || {};
    if (!from || !to || !date) return { error: "Missing required fields: from, to, date" };

    const weekday = weekdayOf(date);
    if (weekday === -1) return { error: "Invalid date, expected YYYY-MM-DD" };

    const fromCodes = resolveStationCodes(from);
    const toCodes = resolveStationCodes(to);
    if (fromCodes.length === 0) return { error: "Unknown source city or station" };
    if (toCodes.length === 0) return { error: "Unknown destination city or station" };

    const { limits } = config;
    return {
        fromCodes, toCodes, date, weekday,
        maxSwitches: clamp(max_switches, 0, limits.maxSwitches, 5),
        maxWait: clamp(max_wait, 30, limits.maxWaitMin, 600),
        sortBy: ['time', 'distance', 'switches'].includes(sort_by) ? sort_by : 'switches',
        topK: clamp(top_k, 1, limits.maxTopK, 10)
    };
}

/**
 * Runs an engine request through the cache and writes the HTTP response.
 * Deterministic engine input errors are cached too (as { __error }).
 */
async function respondCached(res, cacheKey, payload) {
    try {
        const results = await routeCache.getOrCompute(cacheKey, async () => {
            const r = await engine.sendRequestToEngine(payload);
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

/**
 * Route search (ranked list of up to top_k journeys).
 * Supports "All Stations" searches via CITY: prefix.
 */
exports.searchRoute = async (req, res) => {
    const q = parseRouteInput(inputOf(req));
    if (q.error) return res.status(400).json({ error: q.error });

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
    return respondCached(res, cacheKey, payload);
};

/**
 * Pareto search: for each number of changes, the earliest-arriving journey,
 * listed only when it beats every option with fewer changes.
 */
exports.paretoRoute = async (req, res) => {
    const q = parseRouteInput(inputOf(req));
    if (q.error) return res.status(400).json({ error: q.error });

    const payload = {
        type: 'pareto',
        from: q.fromCodes,
        to: q.toCodes,
        date: q.date,
        max_switches: q.maxSwitches,
        max_wait: q.maxWait
    };
    const cacheKey = JSON.stringify(['pareto', q.fromCodes, q.toCodes, q.weekday, q.maxSwitches, q.maxWait]);
    return respondCached(res, cacheKey, payload);
};

exports._internals = { resolveStationCodes, weekdayOf, routeCache };
