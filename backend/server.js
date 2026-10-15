/**
 * server.js
 *
 * Entry point for the RailYatra backend server.
 * Imports the configured app and starts background services.
 */

const app = require('./src/app');
const config = require('./src/config');
const engine = require('./src/services/engine.service');
const log = require('./src/services/logger');

// Start the engine pool before accepting traffic; /readyz reports 503 until
// at least one worker has loaded the timetable.
engine.spawnEngine();

const server = app.listen(config.port, () => {
    log.info('server listening', { port: Number(config.port), enginePool: config.enginePoolSize });
});

// Keep-alive must outlive the load balancer's idle timeout to avoid 502s.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful shutdown: stop accepting, drain in-flight requests, then stop engines.
let stopping = false;
function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    log.info('shutdown requested, draining', { signal });
    server.close(() => {
        engine.shutdown();
        log.info('shutdown complete');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 15000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Zero-downtime timetable reload: replace master_train_data.json, then `kill -HUP <pid>`.
process.on('SIGHUP', () => {
    engine.reload()
        .then((version) => log.info('timetable reloaded via SIGHUP', { version }))
        .catch((e) => log.error('timetable reload failed', { err: e.message }));
});
process.on('SIGINT', () => shutdown('SIGINT'));
