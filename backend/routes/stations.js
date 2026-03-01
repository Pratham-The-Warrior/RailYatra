const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

let stationCache = null;

router.get('/', async (req, res) => {
    const q = (req.query.q || '').toUpperCase();
    if (q.length < 2) return res.json([]);

    try {
        if (!stationCache) {
            const registryPath = path.join(__dirname, '../../stations.json');
            const data = fs.readFileSync(registryPath, 'utf8');
            stationCache = JSON.parse(data);
        }

        const filtered = stationCache.filter(s =>
            s.code.includes(q) || s.name.toUpperCase().includes(q)
        ).slice(0, 10);

        res.json(filtered);
    } catch (e) {
        console.error("Stations error:", e);
        res.status(500).json({ error: "Failed to fetch stations" });
    }
});

module.exports = router;
