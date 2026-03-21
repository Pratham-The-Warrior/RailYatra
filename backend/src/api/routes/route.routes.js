const express = require('express');
const router = express.Router();
const controller = require('../controllers/route.controller');

/**
 * @route   POST /api/route
 * @desc    Search for train routes between two stations
 */
router.post('/', controller.searchRoute);

module.exports = router;
