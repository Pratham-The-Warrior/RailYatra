const express = require('express');
const Fuse = require('fuse.js');

/**
 * GET /api/stations?q=: fuzzy station autocomplete, with "City - All Stations"
 * entries first when the query matches a city. Search indexes are rebuilt
 * whenever reference data is reloaded.
 */
function buildIndexes({ stations, cities }) {
    const stationIndex = new Fuse(stations, {
        includeScore: true,
        shouldSort: true,
        // 0.0 = exact match only, 1.0 = matches anything; 0.4 tolerates typos like "dehli".
        threshold: 0.4,
        ignoreLocation: true,
        keys: [
            { name: 'name', weight: 0.7 },
            { name: 'code', weight: 0.3 }
        ]
    });
    const cityList = Object.entries(cities).map(([key, value]) => ({
        key,
        display: value.display,
        stationCount: value.stations.length
    }));
    const cityIndex = new Fuse(cityList, {
        includeScore: true,
        shouldSort: true,
        threshold: 0.3,
        ignoreLocation: true,
        keys: [
            { name: 'display', weight: 0.8 },
            { name: 'key', weight: 0.2 }
        ]
    });
    return { stationIndex, cityIndex };
}

function createRouter({ caches, referenceData }) {
    const router = express.Router();
    // Fuzzy search costs a few ms; autocomplete prefixes repeat a lot.
    const searchCache = caches.create({ name: 'stations', maxEntries: 20000, ttlMs: 60 * 60 * 1000 });
    let indexes = buildIndexes(referenceData.current());
    referenceData.onChange((snapshot) => { indexes = buildIndexes(snapshot); });

    router.get('/', (req, res) => {
        const q = String(req.query.q || '').trim().toLowerCase().slice(0, 64);
        if (q.length < 2) return res.json([]);
        res.set('Cache-Control', 'public, max-age=3600');

        const cached = searchCache.get(q);
        if (cached) return res.json(cached);

        const cityResults = indexes.cityIndex.search(q).slice(0, 3).map((r) => ({
            code: `CITY:${r.item.key}`,
            name: `${r.item.display} - All Stations`,
            isCity: true,
            stationCount: r.item.stationCount
        }));
        const stationResults = indexes.stationIndex.search(q).slice(0, 10).map((r) => r.item);

        const body = [...cityResults, ...stationResults];
        searchCache.set(q, body);
        res.json(body);
    });
    return router;
}

module.exports = { name: 'stations', mountPath: '/api/stations', createRouter };
