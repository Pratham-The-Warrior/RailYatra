const express = require('express');
const router = express.Router();
const controller = require('../controllers/stations.controller');

/**
 * @route   GET /api/stations
 * @desc    Search for stations by code or name
 */
router.get('/', controller.getStations);

module.exports = router;
