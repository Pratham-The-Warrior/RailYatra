const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { sendRequestToEngine } = require('../../services/engine.service');

/**
 * Controller for train schedule retrieval.
 */
exports.getSchedule = async (req, res) => {
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

        const jsonData = engineResponse.results || engineResponse;

        if (!jsonData || Object.keys(jsonData).length === 0) {
            return res.status(404).json({ error: "Schedule not found" });
        }

        const hasPdf = config.pdfBaseUrl ? true : fs.existsSync(pdfPath);

        res.json({
            ...jsonData,
            hasPdf,
            pdfUrl: hasPdf ? `/api/pdf/${trainNumber}` : null
        });
    } catch (e) {
        console.error("[Schedule Controller Error]:", e);
        res.status(500).json({ error: "Failed to fetch schedule" });
    }
};
