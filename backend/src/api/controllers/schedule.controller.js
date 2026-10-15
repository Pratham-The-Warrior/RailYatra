const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { sendRequestToEngine } = require('../../services/engine.service');
const { LruCache } = require('../../services/cache');
const log = require('../../services/logger');

const scheduleCache = new LruCache({ name: 'schedule', maxEntries: 10000, ttlMs: 60 * 60 * 1000 });

/**
 * Controller for train schedule retrieval.
 */
exports.getSchedule = async (req, res) => {
    const { trainNumber: rawTrainNumber } = req.params;
    if (!/^\d{1,5}$/.test(rawTrainNumber)) {
        return res.status(400).json({ error: "Invalid train number" });
    }
    const trainNumber = rawTrainNumber.padStart(5, '0');

    const pdfFileName = `train_schedule_${trainNumber}.pdf`;
    const pdfPath = path.join(config.pdfDirPath, pdfFileName);

    try {
        const jsonData = await scheduleCache.getOrCompute(trainNumber, async () => {
            const r = await sendRequestToEngine({ type: "schedule", train_number: trainNumber });
            return r && r.error ? { __error: r.error } : r;
        });

        if (!jsonData || jsonData.__error || Object.keys(jsonData).length === 0) {
            return res.status(404).json({ error: (jsonData && jsonData.__error) || "Schedule not found" });
        }

        const hasPdf = config.pdfBaseUrl ? true : fs.existsSync(pdfPath);

        res.set('Cache-Control', 'public, max-age=3600');
        res.json({
            ...jsonData,
            hasPdf,
            pdfUrl: hasPdf ? `/api/pdf/${trainNumber}` : null
        });
    } catch (e) {
        log.error('schedule lookup failed', { train: trainNumber, err: e.message });
        res.status(e.status || 500).json({ error: "Failed to fetch schedule" });
    }
};
