const express = require('express');
const { badRequest } = require('../../platform/errors');
const { isTrainNumber } = require('../../platform/validation');
const { timetablePosition, istMinutes, dayOfIsoDate, weekdayOfDay } = require('./timetablePosition');

/**
 * GET /api/livestatus/:trainNumber[?date=YYYY-MM-DD]
 *
 * Where the train should be now according to its timetable (source:
 * "timetable"). There is no live running feed, so the response says so and
 * never claims delays or platforms. `date` selects the run by its start date;
 * by default the run currently en route (or the next one) is shown.
 */
const MAX_DATE_DISTANCE_DAYS = 31;

function createRouter({ config, routing, caches, log, engineGate, now = () => new Date() }) {
    const router = express.Router();
    const timetables = caches.create({
        name: 'livestatus-timetable', maxEntries: 5000, maxBytes: config.smallCacheMaxMb * 1024 * 1024, ttlMs: 60 * 60 * 1000
    });

    router.get('/:trainNumber', async (req, res) => {
        if (!isTrainNumber(req.params.trainNumber)) throw badRequest('Invalid train number');
        const trainNumber = req.params.trainNumber.padStart(5, '0');
        const current = now();

        let runDay;
        if (req.query.date !== undefined) {
            runDay = dayOfIsoDate(String(req.query.date));
            if (runDay === null) throw badRequest('Invalid date, expected YYYY-MM-DD');
            const today = Math.floor(istMinutes(current) / 1440);
            if (Math.abs(runDay - today) > MAX_DATE_DISTANCE_DAYS) {
                throw badRequest(`date must be within ${MAX_DATE_DISTANCE_DAYS} days of today`);
            }
        }

        if (timetables.get(trainNumber) === undefined && !engineGate(req, res)) return;
        let train;
        try {
            train = await timetables.getOrCompute(trainNumber, async () => {
                const r = await routing.request({ type: 'schedule', train_number: trainNumber });
                return r && !r.error && Array.isArray(r.schedule) ? r : null;
            });
        } catch (e) {
            log.error('live status timetable lookup failed', { train: trainNumber, err: e.message });
            if (e.status === 503) res.set('Retry-After', '1');
            return res.status(e.status || 500).json({ error: 'Failed to fetch the timetable' });
        }
        if (!train) return res.status(404).json({ error: `Train ${trainNumber} was not found in the timetable` });

        const operatingDays = Object.fromEntries(
            Object.entries(train.operating_days || {}).map(([d, v]) => [d.toLowerCase(), v]));
        if (runDay !== undefined && operatingDays[weekdayOfDay(runDay)] !== true) {
            return res.status(404).json({ error: `Train ${trainNumber} does not start its journey on ${req.query.date}` });
        }

        const result = timetablePosition({ ...train, operating_days: operatingDays }, current, runDay);
        if (result.error) return res.status(404).json({ error: result.error });
        // Positions change minute by minute.
        res.set('Cache-Control', 'public, max-age=30');
        res.json(result);
    });
    return router;
}

module.exports = { name: 'livestatus', mountPath: '/api/livestatus', createRouter };
