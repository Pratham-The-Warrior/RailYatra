const fs = require('fs');
const path = require('path');
const Fuse = require('fuse.js');

let stationCache = null;
let fuseInstance = null;
let cityStationsData = null;
let cityFuseInstance = null;

/**
 * Loads the city-to-stations mapping for "All Stations" feature.
 */
function loadCityStations() {
    if (cityStationsData) return;
    try {
        const cityPath = path.join(__dirname, '..', '..', '..', '..', 'city_stations.json');
        const data = fs.readFileSync(cityPath, 'utf8');
        cityStationsData = JSON.parse(data);

        // Build a searchable list of city entries for fuzzy matching
        const cityList = Object.entries(cityStationsData).map(([key, value]) => ({
            key,
            display: value.display,
            stationCount: value.stations.length
        }));

        cityFuseInstance = new Fuse(cityList, {
            includeScore: true,
            shouldSort: true,
            threshold: 0.3,
            ignoreLocation: true,
            keys: [
                { name: 'display', weight: 0.8 },
                { name: 'key', weight: 0.2 }
            ]
        });
    } catch (e) {
        console.error("[City Stations]: Failed to load city_stations.json:", e.message);
        cityStationsData = {};
    }
}

/**
 * Controller for station autocomplete and lookup.
 * Now also injects "City - All Stations" entries at the top when relevant.
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

        // Load city stations mapping
        loadCityStations();

        // Check if query matches any city name for "All Stations" injection
        let cityResults = [];
        if (cityFuseInstance) {
            const cityMatches = cityFuseInstance.search(q);
            cityResults = cityMatches.slice(0, 3).map(result => ({
                code: `CITY:${result.item.key}`,
                name: `${result.item.display} - All Stations`,
                isCity: true,
                stationCount: result.item.stationCount
            }));
        }

        // The search returns an array of { item, itemIndex, score } objects sorted by score
        const results = fuseInstance.search(q);
        
        // We slice the top 10 and map back strictly to the station items
        const filtered = results.slice(0, 10).map(result => result.item);

        // City "All Stations" entries go first, then regular stations
        res.json([...cityResults, ...filtered]);
    } catch (e) {
        console.error("[Stations Controller Error]:", e);
        res.status(500).json({ error: "Failed to fetch stations" });
    }
};
