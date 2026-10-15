const express = require('express');

/**
 * Operational endpoints (mounted at the root, not under /api):
 *   /healthz  liveness (process is up)
 *   /readyz   readiness (at least one engine can serve); route traffic on this
 *   /metrics  Prometheus text format
 * plus /api/health for humans and the frontend.
 */
function createRouter({ routing, metrics }) {
    const router = express.Router();
    router.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            engine: routing.isReady(),
            dataVersion: routing.dataVersion(),
            engines: routing.status(),
            platform: process.platform
        });
    });
    router.get('/healthz', (req, res) => res.json({ status: 'ok' }));
    router.get('/readyz', (req, res) => {
        if (routing.isReady()) return res.json({ status: 'ready' });
        res.status(503).json({ status: 'engine not ready' });
    });
    router.get('/metrics', (req, res) => {
        res.type('text/plain; version=0.0.4').send(metrics.render());
    });
    return router;
}

module.exports = { name: 'system', mountPath: '/', createRouter };
