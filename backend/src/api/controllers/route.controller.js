const engine = require('../../services/engine.service');

/**
 * Controller to handle complex route search logic.
 */
exports.searchRoute = async (req, res) => {
    const { from, to, date, max_switches, max_wait, sort_by, top_k } = req.body;

    if (!from || !to || !date) {
        return res.status(400).json({ error: "Missing required fields: from, to, date" });
    }

    try {
        const extractCode = (s) => {
            const match = s.match(/\(([A-Z]+)\)$/);
            return match ? match[1] : s.toUpperCase();
        };

        const results = await engine.sendRequestToEngine({
            from: extractCode(from),
            to: extractCode(to),
            date,
            max_switches: parseInt(max_switches) || 5,
            max_wait: parseInt(max_wait) || 600,
            sort_by: sort_by || 'switches',
            top_k: parseInt(top_k) || 10
        });

        if (results.error) {
            return res.status(400).json(results);
        }

        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
