const express = require('express');
const router = express.Router();

// Import sub-routers
const routeRoutes = require('./route.routes');
const stationsRoutes = require('./stations.routes');
const scheduleRoutes = require('./schedule.routes');
const pdfRoutes = require('./pdf.routes');
const categoryRoutes = require('./category.routes');
const liveStatusRoutes = require('./livestatus.routes');

/**
 * API Root Router
 * Aggregates all versioned or functional routes.
 */
router.use('/route', routeRoutes);
router.use('/stations', stationsRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/pdf', pdfRoutes);
router.use('/category', categoryRoutes);
router.use('/livestatus', liveStatusRoutes);

module.exports = router;
