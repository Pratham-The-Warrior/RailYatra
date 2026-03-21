const express = require('express');
const router = express.Router();
const controller = require('../controllers/livestatus.controller');
const rateLimit = require('express-rate-limit');

// Rate limit for live status: 10 requests per 15 minutes per IP
const statusLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many status requests from this IP, please try again after 15 minutes." }
});

/**
 * @route   GET /api/livestatus/:trainNumber
 * @desc    Fetch real-time running status of a train
 * @access  Public
 */
router.get('/:trainNumber', statusLimiter, controller.getTrainStatus);

module.exports = router;
