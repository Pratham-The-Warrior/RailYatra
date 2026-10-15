const express = require('express');

/** GET /api/category/:category: special-train collections (e.g. Vande Bharat). */
function createRouter({ referenceData }) {
    const router = express.Router();
    router.get('/:category', (req, res) => {
        const category = String(req.params.category || '').toLowerCase();
        const trainList = referenceData.current().categories.get(category);
        if (!trainList) {
            return res.status(404).json({ error: `Route data for ${req.params.category} not found` });
        }
        res.set('Cache-Control', 'public, max-age=3600');
        res.json(trainList);
    });
    return router;
}

module.exports = { name: 'categories', mountPath: '/api/category', createRouter };
