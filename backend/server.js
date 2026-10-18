/**
 * Process entry point: build the container, start engines, serve HTTP,
 * handle signals. All wiring lives in src/container.js and src/app.js.
 */
const { createContainer } = require('./src/container');
const { createApp } = require('./src/app');

const container = createContainer();
const { config, log } = container;

// Engines start before traffic; /readyz reports 503 until one is ready.
container.start();
const app = createApp(container);

const server = app.listen(config.port, () => {
    log.info('server listening', {
        port: config.port, enginePool: config.enginePoolSize,
        memoryLimitMb: config.system.memoryMb, routeCacheMaxMb: config.routeCacheMaxMb, smallCacheMaxMb: config.smallCacheMaxMb
    });
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
    server.close(async () => {
        const clean = await container.shutdown();
        log.info('shutdown complete', { enginesStopped: clean });
        process.exit(clean ? 0 : 1);
    });
    setTimeout(() => process.exit(1), 15000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Zero-downtime data reload: publish new data (python3 -m datapipe publish), then `kill -HUP <pid>`.
process.on('SIGHUP', () => {
    container.reloadData()
        .then((version) => log.info('timetable reloaded via SIGHUP', { version }))
        .catch((e) => log.error('timetable reload failed', { err: e.message }));
});
