const express = require('express');
const fs = require('fs');
const path = require('path');
const modules = require('./modules');
const { HttpError } = require('./platform/errors');

/**
 * Builds the HTTP application from a container (see container.js).
 * Cross-cutting concerns live here; features live in ./modules.
 */
const OPS_PATHS = new Set(['/healthz', '/readyz', '/metrics']);

function createApp(container, { featureModules = modules } = {}) {
    const { routing, metrics, log, config } = container;
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
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'X-Instance-Id': config.instanceId
        });
        // Safe default for CDNs and proxies on dynamic endpoints: not cacheable
        // unless a handler opts in (successful route/schedule/station/category
        // responses do). Without it, health checks and error/503 responses could
        // be cached at the edge. Static files are left alone: express.static only
        // sets its own long-lived Cache-Control when none is present.
        if (req.path.startsWith('/api/') || OPS_PATHS.has(req.path)) res.set('Cache-Control', 'no-store');
        if (req.path.startsWith('/api/')) {
            const v = routing.dataVersion();
            if (v) res.set('X-Data-Version', v);
        }
        // Label from the full original path, computed now: inside mounted
        // routers Express rewrites req.path, so reading it on 'finish' would
        // mislabel every API response as "static". Low cardinality: /api/<resource>.
        const fullPath = req.originalUrl.split('?')[0];
        const route = fullPath.startsWith('/api/') ? '/api/' + fullPath.split('/')[2] : 'static';
        const start = process.hrtime.bigint();
        res.on('finish', () => {
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
        // index: false, so "/" falls through to the handler below: index.html must
        // always revalidate, or after a deploy a cached copy would reference
        // hashed bundles that no longer exist (blank page until it expires).
        app.use(express.static(distPath, { maxAge: '1h', index: false }));
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
