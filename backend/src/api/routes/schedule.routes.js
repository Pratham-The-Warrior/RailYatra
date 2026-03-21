const express = require('express');
const router = express.Router();
const controller = require('../controllers/schedule.controller');

/**
 * @route   GET /api/schedule/:trainNumber
 * @desc    Fetch the full schedule for a specific train
 */
router.get('/:trainNumber', controller.getSchedule);

module.exports = router;
