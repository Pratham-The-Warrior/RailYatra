const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

/**
 * Reference data: stations, city groupings and train categories.
 *
 * Loaded as an immutable snapshot. A data reload is two-phase so the
 * application never serves a half-updated state:
 *   prepare() parses the new files and throws if any required file is broken
 *             (nothing changes);
 *   commit()  swaps the snapshot in and emits 'changed' so modules can rebuild
 *             their indexes.
 */

const CATEGORY_FILE = /^master_train_data_([a-z0-9]+)\.json$/;

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function summarizeCategory(trains) {
    return trains.map((t) => {
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
}

function createReferenceData({ dir, log }) {
    const events = new EventEmitter();
    let snapshot = null;

    function prepare() {
        const stations = readJson(path.join(dir, 'stations.json'));
        if (!Array.isArray(stations)) throw new Error('stations.json: expected an array');

        let cities = {};
        try {
            cities = readJson(path.join(dir, 'city_stations.json'));
        } catch (e) {
            // Optional feature: city ("All Stations") search is disabled without it.
            log.error('failed to load city_stations.json', { err: e.message });
        }

        const categories = new Map();
        for (const file of fs.readdirSync(dir)) {
            const m = CATEGORY_FILE.exec(file);
            if (!m) continue;
            try {
                categories.set(m[1], summarizeCategory(readJson(path.join(dir, file))));
            } catch (e) {
                log.error('category load failed', { file, err: e.message });
            }
        }
        return Object.freeze({ stations, cities, categories });
    }

    function commit(next) {
        snapshot = next;
        events.emit('changed', snapshot);
    }

    return {
        prepare,
        commit,
        load() { commit(prepare()); },
        current() {
            if (!snapshot) throw new Error('reference data not loaded');
            return snapshot;
        },
        onChange(listener) { events.on('changed', listener); }
    };
}

module.exports = { createReferenceData };
