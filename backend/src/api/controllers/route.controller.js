const fs = require('fs');
const path = require('path');
const engine = require('../../services/engine.service');

let cityStationsData = null;

/**
 * Loads the city-to-stations mapping (cached after first load).
 */
function getCityStations() {
    if (cityStationsData) return cityStationsData;
    try {
        const cityPath = path.join(__dirname, '..', '..', '..', '..', 'city_stations.json');
        const data = fs.readFileSync(cityPath, 'utf8');
        cityStationsData = JSON.parse(data);
    } catch (e) {
        console.error("[Route Controller]: Failed to load city_stations.json:", e.message);
        cityStationsData = {};
    }
    return cityStationsData;
}

/**
 * Resolves a station code (or CITY:KEY) to an array of station codes.
 * Regular station code "CSMT" → ["CSMT"]
 * City prefix "CITY:MUMBAI" → ["CSMT", "BCT", "LTT", "DR", ...]
 */
function resolveStationCodes(input) {
    if (input.startsWith('CITY:')) {
        const cityKey = input.substring(5); // Remove "CITY:" prefix
        const cityData = getCityStations();
        if (cityData[cityKey]) {
            return cityData[cityKey].stations;
        }
        return []; // Unknown city
    }
    // Regular station code — extract code from display format if needed
    const match = input.match(/\(([A-Z]+)\)$/);
    return [match ? match[1] : input.toUpperCase()];
}

/**
 * Controller to handle complex route search logic.
 * Now supports "All Stations" searches via CITY: prefix.
 */
exports.searchRoute = async (req, res) => {
    const { from, to, date, max_switches, max_wait, sort_by, top_k } = req.body;

    if (!from || !to || !date) {
        return res.status(400).json({ error: "Missing required fields: from, to, date" });
    }

    try {
        const fromCodes = resolveStationCodes(from);
        const toCodes = resolveStationCodes(to);

        if (fromCodes.length === 0) {
            return res.status(400).json({ error: "Unknown source city or station" });
        }
        if (toCodes.length === 0) {
            return res.status(400).json({ error: "Unknown destination city or station" });
        }

        const isMulti = fromCodes.length > 1 || toCodes.length > 1;

        const requestPayload = {
            type: isMulti ? 'multi_route' : 'route',
            from: isMulti ? fromCodes : fromCodes[0],
            to: isMulti ? toCodes : toCodes[0],
            date,
            max_switches: parseInt(max_switches) || 5,
            max_wait: parseInt(max_wait) || 600,
            sort_by: sort_by || 'switches',
            top_k: parseInt(top_k) || 10
        };

        const results = await engine.sendRequestToEngine(requestPayload);

        if (results.error) {
            return res.status(400).json(results);
        }

        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
