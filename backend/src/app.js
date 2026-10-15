const express = require('express');
const fs = require('fs');
const path = require('path');
const modules = require('./modules');
const { HttpError } = require('./platform/errors');

/**
 * Builds the HTTP application from a container (see container.js).
 * Cross-cutting concerns live here; features live in ./modules.
 */
function createApp(container, { featureModules = modules } = {}) {
    const { routing, metrics, log } = container;
    const app = express();

    // Trust the first reverse proxy (load balancer / CDN) for client IPs.
    app.set('trust proxy', 1);
    app.disable('x-powered-by');

    // Security headers, data version and request metrics.
    app.use((req, res, next) => {
        res.set({
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
        });
        if (req.path.startsWith('/api/')) {
            const v = routing.dataVersion();
            if (v) res.set('X-Data-Version', v);
        }
        const start = process.hrtime.bigint();
        res.on('finish', () => {
            // Low-cardinality route label: /api/<resource>
            const route = req.path.startsWith('/api/') ? '/api/' + req.path.split('/')[2] : 'static';
            metrics.inc('http_requests_total', { route, status: res.statusCode });
            metrics.observe('http_request_ms', Number(process.hrtime.bigint() - start) / 1e6, { route });
        });
        next();
    });

    app.use(express.json({ limit: '10kb' }));

    for (const mod of featureModules) {
        app.use(mod.mountPath, mod.createRouter(container));
    }
    app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

    // Frontend production bundle with client-side routing fallback.
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

    // Central error handler: client errors keep their message, server errors never leak details.
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        const status = err instanceof HttpError ? err.status : (err.status || err.statusCode || 500);
        if (status >= 500) log.error('unhandled request error', { path: req.path, err: err.message });
        res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
    });

    return app;
}

module.exports = { createApp };
