const { STATION_CODE } = require('../../platform/validation');

/**
 * Resolves user input to engine station codes.
 *   "CSMT" / "C SHIVAJI MAH T (CSMT)" -> ["CSMT"]
 *   "CITY:MUMBAI"                     -> every station of that city (capped)
 * Returns [] for unknown cities and malformed input.
 */
function resolveStationCodes(input, cities, maxCityStations) {
    if (typeof input !== 'string') return [];
    if (input.startsWith('CITY:')) {
        const city = cities[input.substring(5)];
        return city ? city.stations.slice(0, maxCityStations) : [];
    }
    const match = input.match(/\(([A-Z0-9]+)\)$/);
    const code = (match ? match[1] : input).trim().toUpperCase();
    return STATION_CODE.test(code) ? [code] : [];
}

module.exports = { resolveStationCodes };
