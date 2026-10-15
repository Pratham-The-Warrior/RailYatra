const fs = require('fs');
const path = require('path');
const express = require('express');
const { badRequest, notFound } = require('../../platform/errors');
const { isTrainNumber } = require('../../platform/validation');

/** GET /api/pdf/:trainNumber: schedule PDF (served locally or redirected to PDF_BASE_URL). */
function createRouter({ config }) {
    const router = express.Router();
    router.get('/:trainNumber', (req, res) => {
        // Strict whitelist: prevents path traversal via encoded "../" in the param.
        if (!isTrainNumber(req.params.trainNumber)) throw badRequest('Invalid train number');
        const fileName = `train_schedule_${req.params.trainNumber.padStart(5, '0')}.pdf`;
        if (config.pdfBaseUrl) return res.redirect(`${config.pdfBaseUrl}/${fileName}`);

        const pdfPath = path.join(config.pdfDirPath, fileName);
        if (!fs.existsSync(pdfPath)) throw notFound('PDF not found');
        res.contentType('application/pdf');
        res.set('Cache-Control', 'public, max-age=86400');
        res.sendFile(pdfPath);
    });
    return router;
}

module.exports = { name: 'pdf', mountPath: '/api/pdf', createRouter };
