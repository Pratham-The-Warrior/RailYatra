const express = require('express');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./api/routes');
const engine = require('./services/engine.service');
const metrics = require('./services/metrics');

const app = express();

// Trust the first reverse proxy (load balancer / CDN) for client IPs.
app.set('trust proxy', 1);
app.disable('x-powered-by');

/**
 * Security headers + request metrics.
 */
app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    });
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        // Low-cardinality route label: /api/<resource>
        const route = req.path.startsWith('/api/') ? '/api/' + req.path.split('/')[2] : 'static';
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        metrics.inc('http_requests_total', { route, status: res.statusCode });
        metrics.observe('http_request_ms', ms, { route });
    });
    next();
});

app.use(express.json({ limit: '10kb' }));

/**
 * Liveness: process is up. Readiness: at least one engine worker can serve.
 * Load balancers / Kubernetes should route traffic based on readiness.
 */
const health = (req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        engine: engine.isReady(),
        engines: engine.status(),
        platform: process.platform
    });
};
app.get('/api/health', health);
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (req, res) => {
    if (engine.isReady()) return res.json({ status: 'ready' });
    res.status(503).json({ status: 'engine not ready' });
});
app.get('/metrics', (req, res) => {
    res.type('text/plain; version=0.0.4').send(metrics.render());
});

/**
 * Root API Gateway
 */
app.use('/api', apiRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

/**
 * Frontend Production Serving
 * Serves the React 'dist' bundle and handles client-side routing.
 */
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
    // Hashed assets are immutable; index.html must always revalidate.
    app.use('/assets', express.static(path.join(distPath, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(distPath, { maxAge: '1h' }));
    app.use((req, res) => {
        res.set('Cache-Control', 'no-cache');
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

/**
 * Error handler: malformed JSON bodies etc. never leak stack traces.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error('[Server Error]:', err.message);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

module.exports = app;
