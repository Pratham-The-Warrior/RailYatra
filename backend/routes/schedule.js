const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { sendRequestToEngine } = require('../engine');

router.get('/:trainNumber', async (req, res) => {
    const { trainNumber: rawTrainNumber } = req.params;
    const trainNumber = rawTrainNumber.padStart(5, '0');

    const pdfFileName = `train_schedule_${trainNumber}.pdf`;
    const pdfPath = path.join(config.pdfDirPath, pdfFileName);

    try {
        const engineResponse = await sendRequestToEngine({
            type: "schedule",
            train_number: trainNumber
        });

        if (engineResponse.error) {
            return res.status(404).json({ error: engineResponse.error });
        }

        // The engine returns the schedule in 'results' or the whole object depending on its structure
        const jsonData = engineResponse.results || engineResponse;

        if (!jsonData || Object.keys(jsonData).length === 0) {
            return res.status(404).json({ error: "Schedule not found" });
        }

        // If pdfBaseUrl is set, we optimistically assume PDF exists since 
        // we aren't bundling them to check locally.
        const hasPdf = config.pdfBaseUrl ? true : fs.existsSync(pdfPath);

        res.json({
            ...jsonData,
            hasPdf,
            pdfUrl: hasPdf ? `/api/pdf/${trainNumber}` : null
        });
    } catch (e) {
        console.error("Error fetching schedule:", e);
        res.status(500).json({ error: "Failed to fetch schedule" });
    }
});

module.exports = router;
