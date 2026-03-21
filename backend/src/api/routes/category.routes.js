const express = require('express');
const router = express.Router();
const controller = require('../controllers/category.controller');

/**
 * @route   GET /api/category/:category
 * @desc    Fetch lists of special trains (Vande Bharat, Superfast, etc.)
 */
router.get('/:category', controller.getCategoryTrains);

module.exports = router;
