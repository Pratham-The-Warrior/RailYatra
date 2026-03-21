const express = require('express');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./api/routes');
const engine = require('./services/engine.service');

const app = express();

/**
 * Global Middleware
 */
app.use(express.json());

/**
 * Root API Gateway
 */
app.use('/api', apiRoutes);

/**
 * System Health Check
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        engine: !!engine.getEngineProcess(),
        platform: process.platform
    });
});

/**
 * Frontend Production Serving
 * Serves the React 'dist' bundle and handles client-side routing.
 */
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res) => {
        // Only fallback to index.html for non-API routes
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'));
        }
    });
}

module.exports = app;
