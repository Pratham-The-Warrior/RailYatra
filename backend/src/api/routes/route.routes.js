const express = require('express');
const router = express.Router();
const controller = require('../controllers/route.controller');

/**
 * @route   POST /api/route
 * @desc    Search for train routes between two stations
 */
router.post('/', controller.searchRoute);

/**
 * @route   GET /api/route?from=&to=&date=&max_switches=&max_wait=&sort_by=&top_k=
 * @desc    Same as POST, but cacheable by URL at the CDN/browser
 */
router.get('/', controller.searchRoute);

/**
 * @route   GET /api/route/pareto?from=&to=&date=&max_switches=&max_wait=
 * @desc    Best trade-offs: earliest arrival for each number of changes
 */
router.get('/pareto', controller.paretoRoute);

module.exports = router;
