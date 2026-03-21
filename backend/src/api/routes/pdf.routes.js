const express = require('express');
const router = express.Router();
const controller = require('../controllers/pdf.controller');

/**
 * @route   GET /api/pdf/:trainNumber
 * @desc    Download or redirect to a PDF schedule
 */
router.get('/:trainNumber', controller.getPdf);

module.exports = router;
