const fs = require('fs');
const path = require('path');
const config = require('../../config');

/**
 * Controller for special train categories (e.g. Vande Bharat).
 * Category files are discovered once at startup (master_train_data_<id>.json),
 * so only known categories can be requested and each file is parsed once.
 */
const categories = new Map();

function loadCategories() {
    for (const file of fs.readdirSync(config.projectRoot)) {
        const m = /^master_train_data_([a-z0-9]+)\.json$/.exec(file);
        if (!m) continue;
        try {
            const trains = JSON.parse(fs.readFileSync(path.join(config.projectRoot, file), 'utf8'));
            categories.set(m[1], trains.map(t => {
                const firstStop = t.schedule[0];
                const lastStop = t.schedule[t.schedule.length - 1];
                return {
                    train_number: t.train_number,
                    train_name: t.train_name,
                    type: t.type,
                    classes_available: t.classes_available,
                    operating_days: t.operating_days,
                    source: {
                        station_code: firstStop.station_code,
                        station_name: firstStop.station_name,
                        departure_time: firstStop.departure_time
                    },
                    destination: {
                        station_code: lastStop.station_code,
                        station_name: lastStop.station_name,
                        arrival_time: lastStop.arrival_time
                    }
                };
            }));
        } catch (e) {
            console.error(`[Category Controller]: failed to load ${file}: ${e.message}`);
        }
    }
}
loadCategories();

exports.getCategoryTrains = (req, res) => {
    const category = String(req.params.category || '').toLowerCase();
    const trainList = categories.get(category);
    if (!trainList) {
        return res.status(404).json({ error: `Route data for ${req.params.category} not found` });
    }
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(trainList);
};
