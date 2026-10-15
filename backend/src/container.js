const { loadConfig } = require('./platform/config');
const log = require('./platform/logger');
const metrics = require('./platform/metrics');
const { CacheRegistry } = require('./platform/cache');
const { createReferenceData } = require('./platform/referenceData');
const { createRouting } = require('./platform/routing');
const { TokenBucketLimiter, createEngineGate } = require('./platform/rateLimit');

/**
 * Composition root: builds every shared dependency once and wires them
 * together. Feature modules receive this object and never construct
 * infrastructure themselves, so adapters (cache store, routing backend) can
 * be swapped here without touching features.
 */
function createContainer({ env = process.env } = {}) {
    const config = loadConfig(env);
    const caches = new CacheRegistry();
    const referenceData = createReferenceData({ dir: config.referenceDataDir, log });
    const routing = createRouting({ config, log, metrics });
    const rl = config.rateLimit;
    const requestLimiter = rl.enabled
        ? new TokenBucketLimiter({ ratePerSec: rl.ratePerSec, burst: rl.burst, maxClients: rl.maxClients })
        : null;
    const engineLimiter = rl.enabled
        ? new TokenBucketLimiter({ ratePerSec: rl.engineRatePerSec, burst: rl.engineBurst, maxClients: rl.maxClients })
        : null;
    let reloading = null;

    return {
        config,
        log,
        metrics,
        caches,
        referenceData,
        routing,
        /** Per-client limiter for all API requests (null when disabled). */
        requestLimiter,
        /** (req, res) => boolean: call before engine work on a cache miss. */
        engineGate: createEngineGate({ limiter: engineLimiter, metrics }),

        /** Loads reference data (throws if a required file is broken) and starts the engines. */
        start() {
            referenceData.load();
            routing.start();
        },

        /**
         * Zero-downtime data reload, all-or-nothing:
         *   1. parse the new reference files (broken files -> nothing changes)
         *   2. start and swap in a new engine pool (failure -> nothing changes)
         *   3. swap reference data, then invalidate every cache.
         * Steps 2's swap and 3 run without yielding to other requests, so no
         * request sees the new timetable with old reference data or vice versa.
         */
        reloadData() {
            if (reloading) return reloading;
            reloading = (async () => {
                const snapshot = referenceData.prepare();
                const version = await routing.reload();
                referenceData.commit(snapshot);
                caches.clearAll();
                return version;
            })().finally(() => { reloading = null; });
            return reloading;
        },

        /** Resolves true once every engine process has exited. */
        shutdown() {
            return routing.shutdown();
        }
    };
}

module.exports = { createContainer };
