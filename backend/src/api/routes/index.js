const express = require('express');
const router = express.Router();

// Import sub-routers
const routeRoutes = require('./route.routes');
const stationsRoutes = require('./stations.routes');
const scheduleRoutes = require('./schedule.routes');
const pdfRoutes = require('./pdf.routes');
const categoryRoutes = require('./category.routes');

/**
 * API Root Router
 * Aggregates all versioned or functional routes.
 */
router.use('/route', routeRoutes);
router.use('/stations', stationsRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/pdf', pdfRoutes);
router.use('/category', categoryRoutes);

/**
 * Live running status needs a licensed data source (see docs/SCALING_ROADMAP.md,
 * feature #7). Respond explicitly instead of a generic 404 so the UI can explain.
 */
router.get('/livestatus/:trainNumber', (req, res) => {
    res.status(503).json({ error: 'Live train status is temporarily unavailable. Please check back later.' });
});

module.exports = router;
