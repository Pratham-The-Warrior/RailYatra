/**
 * server.js
 *
 * Entry point for the RailYatra backend server.
 * Imports the configured app and starts background services.
 */

const app = require('./src/app');
const config = require('./src/config');
const engine = require('./src/services/engine.service');

// Start the engine pool before accepting traffic; /readyz reports 503 until
// at least one worker has loaded the timetable.
engine.spawnEngine();

const server = app.listen(config.port, () => {
    console.log(`[Server]: backend running at http://localhost:${config.port} (engine pool: ${config.enginePoolSize})`);
});

// Keep-alive must outlive the load balancer's idle timeout to avoid 502s.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful shutdown: stop accepting, drain in-flight requests, then stop engines.
let stopping = false;
function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    console.log(`[Server]: ${signal} received. Draining...`);
    server.close(() => {
        engine.shutdown();
        console.log('[Server]: Closed out remaining connections.');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 15000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
