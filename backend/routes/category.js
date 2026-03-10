const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const VANDE_BHARAT_FILE = path.join(__dirname, '..', '..', 'master_train_data_vandebharat.json');

router.get('/:category', (req, res) => {
    const { category } = req.params;
    console.log(`[Special] Fetching routes for category: ${category}`);

    // Map categories to specific files if they exist
    // Default naming convention: master_train_data_${category}.json
    const categoryFile = path.join(__dirname, '..', '..', `master_train_data_${category.toLowerCase()}.json`);

    try {
        if (!fs.existsSync(categoryFile)) {
            console.error(`[Special] Data file not found for: ${category} at ${categoryFile}`);
            return res.status(404).json({ error: `Route data for ${category} not found` });
        }

        const data = fs.readFileSync(categoryFile, 'utf8');
        const trains = JSON.parse(data);

        const trainList = trains.map(t => {
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
        });

        res.json(trainList);
    } catch (error) {
        console.error(`Error fetching ${category} trains:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
