const fs = require('fs');
const path = require('path');
const express = require('express');
const { badRequest } = require('../../platform/errors');
const { isTrainNumber } = require('../../platform/validation');

/**
 * The engine reports operating days as "Monday"...; the API contract (and
 * every other endpoint) uses the data format's lowercase keys.
 */
function toApiSchedule(engineSchedule) {
    if (!engineSchedule || !engineSchedule.operating_days) return engineSchedule;
    const days = {};
    for (const [day, runs] of Object.entries(engineSchedule.operating_days)) days[day.toLowerCase()] = runs;
    return { ...engineSchedule, operating_days: days };
}

/** GET /api/schedule/:trainNumber: full timetable of one train. */
function createRouter({ config, routing, caches, log }) {
    const router = express.Router();
    const scheduleCache = caches.create({
        name: 'schedule', maxEntries: 10000, maxBytes: config.smallCacheMaxMb * 1024 * 1024, ttlMs: 60 * 60 * 1000
    });

    router.get('/:trainNumber', async (req, res) => {
        const raw = req.params.trainNumber;
        if (!isTrainNumber(raw)) throw badRequest('Invalid train number');
        const trainNumber = raw.padStart(5, '0');
        const pdfPath = path.join(config.pdfDirPath, `train_schedule_${trainNumber}.pdf`);

        let data;
        try {
            data = await scheduleCache.getOrCompute(trainNumber, async () => {
                const r = await routing.request({ type: 'schedule', train_number: trainNumber });
                return r && r.error ? { __error: r.error } : toApiSchedule(r);
            });
        } catch (e) {
            log.error('schedule lookup failed', { train: trainNumber, err: e.message });
            return res.status(e.status || 500).json({ error: 'Failed to fetch schedule' });
        }

        if (!data || data.__error || Object.keys(data).length === 0) {
            return res.status(404).json({ error: (data && data.__error) || 'Schedule not found' });
        }
        const hasPdf = config.pdfBaseUrl ? true : fs.existsSync(pdfPath);
        res.set('Cache-Control', 'public, max-age=3600');
        res.json({ ...data, hasPdf, pdfUrl: hasPdf ? `/api/pdf/${trainNumber}` : null });
    });
    return router;
}

module.exports = { name: 'schedule', mountPath: '/api/schedule', createRouter };
