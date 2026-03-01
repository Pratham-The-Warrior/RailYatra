const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const config = require('../config');

router.get('/:trainNumber', (req, res) => {
    const { trainNumber: rawTrainNumber } = req.params;
    const trainNumber = rawTrainNumber.padStart(5, '0');
    const pdfFileName = `train_schedule_${trainNumber}.pdf`;
    const pdfPath = path.join(config.pdfDirPath, pdfFileName);

    if (config.pdfBaseUrl) {
        return res.redirect(`${config.pdfBaseUrl}/${pdfFileName}`);
    }

    if (fs.existsSync(pdfPath)) {
        res.contentType("application/pdf");
        res.sendFile(pdfPath);
    } else {
        res.status(404).json({ error: "PDF not found" });
    }
});

module.exports = router;
