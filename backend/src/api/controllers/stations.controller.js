const fs = require('fs');
const path = require('path');
const Fuse = require('fuse.js');

let stationCache = null;
let fuseInstance = null;

/**
 * Controller for station autocomplete and lookup.
 */
exports.getStations = async (req, res) => {
    const q = (req.query.q || '');
    if (q.length < 2) return res.json([]);

    try {
        if (!stationCache) {
            const registryPath = path.join(__dirname, '..', '..', '..', '..', 'stations.json');
            const data = fs.readFileSync(registryPath, 'utf8');
            stationCache = JSON.parse(data);
            
            // Initialize Fuse.js for powerful fuzzy searching
            const options = {
                includeScore: true,
                shouldSort: true,
                // Threshold dictates how fuzzy the search is. 
                // 0.0 requires perfect match, 1.0 matches anything. 
                // 0.3-0.4 is a great sweet spot for handling typos like "dehli" -> "delhi"
                threshold: 0.4, 
                // Ignore location means it looks across the whole string rather than strictly at the beginning
                ignoreLocation: true, 
                keys: [
                    { name: 'name', weight: 0.7 },
                    { name: 'code', weight: 0.3 } // Station codes are shorter, so slightly less weight in fuzzy searching
                ]
            };
            fuseInstance = new Fuse(stationCache, options);
        }

        // The search returns an array of { item, itemIndex, score } objects sorted by score
        const results = fuseInstance.search(q);
        
        // We slice the top 10 and map back strictly to the station items
        const filtered = results.slice(0, 10).map(result => result.item);

        res.json(filtered);
    } catch (e) {
        console.error("[Stations Controller Error]:", e);
        res.status(500).json({ error: "Failed to fetch stations" });
    }
};
