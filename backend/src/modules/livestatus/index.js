const express = require('express');

/**
 * GET /api/livestatus/:trainNumber: placeholder until a live data source
 * exists. Answers explicitly (503) so the UI can explain, instead of a 404.
 */
function createRouter() {
    const router = express.Router();
    router.get('/:trainNumber', (req, res) => {
        res.status(503).json({ error: 'Live train status is temporarily unavailable. Please check back later.' });
    });
    return router;
}

module.exports = { name: 'livestatus', mountPath: '/api/livestatus', createRouter };
