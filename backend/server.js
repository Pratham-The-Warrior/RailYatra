/**
 * server.js
 * 
 * Entry point for the RailYatra backend server.
 * Imports the configured app and starts background services.
 */

const app = require('./src/app');
const config = require('./src/config');
const engine = require('./src/services/engine.service');

const server = app.listen(config.port, () => {
    console.log(`[Server]: backend running at http://localhost:${config.port}`);

    // Initialize persistent background services (C++ Core Engine)
    engine.spawnEngine();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Server]: SIGTERM received. Shutting down...');
    server.close(() => {
        console.log('[Server]: Closed out remaining connections.');
        process.exit(0);
    });
});
