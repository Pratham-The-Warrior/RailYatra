const crypto = require('crypto');
const os = require('os');
const path = require('path');

/**
 * Configuration, read once from the environment and validated at startup.
 * An explicitly set but invalid value is an error (fail fast) rather than a
 * silent fallback to the default.
 */

function readInt(env, name, dflt, { min, max }) {
    const raw = env[name];
    if (raw === undefined || raw === '') return dflt;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) {
        throw new Error(`Invalid ${name}=${JSON.stringify(raw)}: expected an integer between ${min} and ${max}`);
    }
    return n;
}

function readBool(env, name, dflt) {
    const raw = env[name];
    if (raw === undefined || raw === '') return dflt;
    if (raw === '1' || raw === 'true') return true;
    if (raw === '0' || raw === 'false') return false;
    throw new Error(`Invalid ${name}=${JSON.stringify(raw)}: expected 1/0 or true/false`);
}

function loadConfig(env = process.env) {
    const isWindows = process.platform === 'win32';
    // __dirname is backend/src/platform -> project root is three levels up.
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    const dataPath = env.TRAIN_DATA_PATH || path.join(projectRoot, 'master_train_data.json');

    const config = {
        port: readInt(env, 'PORT', 3000, { min: 0, max: 65535 }),
        projectRoot,
        enginePath: env.ENGINE_PATH || path.join(projectRoot, 'engine', isWindows ? 'route_engine.exe' : 'route_engine'),
        dataPath,
        // stations.json, city_stations.json and category files (published by datapipe).
        referenceDataDir: env.REFERENCE_DATA_DIR || projectRoot,
        pdfDirPath: path.join(projectRoot, 'train_pdf'),
        pdfBaseUrl: env.PDF_BASE_URL || null,
        routingAdapter: env.ROUTING_ADAPTER || 'local',

        // Engine pool (each engine holds ~55 MB). Containers often report the
        // HOST's core count, so the default is capped; set ENGINE_POOL_SIZE to
        // the instance's real vCPU count in production.
        enginePoolSize: readInt(env, 'ENGINE_POOL_SIZE', Math.max(1, Math.min(4, os.availableParallelism())), { min: 1, max: 256 }),
        // Identifies this instance in logs, /api/health and the X-Instance-Id header,
        // so load tests can verify traffic is spread across replicas.
        instanceId: env.RAILWAY_REPLICA_ID || env.INSTANCE_ID || crypto.randomBytes(4).toString('hex'),
        engineTimeoutMs: readInt(env, 'ENGINE_TIMEOUT_MS', 10000, { min: 100, max: 600000 }),
        engineMaxQueuePerWorker: readInt(env, 'ENGINE_MAX_QUEUE', 200, { min: 1, max: 100000 }),
        engineVerboseLogs: env.ENGINE_VERBOSE_LOGS === '1',

        // Response caches
        routeCacheSize: readInt(env, 'ROUTE_CACHE_SIZE', 50000, { min: 0, max: 10000000 }),
        routeCacheTtlMs: readInt(env, 'ROUTE_CACHE_TTL_MS', 30 * 60 * 1000, { min: 0, max: 7 * 24 * 3600 * 1000 }),
        // Memory budgets in MB. Route lists are ~35 KB each, so an entry limit
        // alone could let the route cache reach gigabytes.
        routeCacheMaxMb: readInt(env, 'ROUTE_CACHE_MAX_MB', 256, { min: 1, max: 65536 }),
        smallCacheMaxMb: readInt(env, 'SMALL_CACHE_MAX_MB', 32, { min: 1, max: 65536 }),

        // Proxies in front of the app whose X-Forwarded-For entries are trusted
        // for the client IP: 1 = Railway's edge only; 2 = Cloudflare + Railway.
        trustProxy: readInt(env, 'TRUST_PROXY', 1, { min: 0, max: 10 }),

        // Per-client rate limits (per instance). Generous by default: many
        // mobile users share one carrier IP. The engine limit applies only to
        // cache misses, so popular searches are never throttled.
        rateLimit: {
            enabled: readBool(env, 'RATE_LIMIT_ENABLED', true),
            ratePerSec: readInt(env, 'RATE_LIMIT_RPS', 50, { min: 1, max: 1000000 }),
            burst: readInt(env, 'RATE_LIMIT_BURST', 200, { min: 1, max: 1000000 }),
            engineRatePerSec: readInt(env, 'ENGINE_RATE_LIMIT_RPS', 5, { min: 1, max: 1000000 }),
            engineBurst: readInt(env, 'ENGINE_RATE_LIMIT_BURST', 30, { min: 1, max: 1000000 }),
            maxClients: readInt(env, 'RATE_LIMIT_MAX_CLIENTS', 100000, { min: 100, max: 10000000 })
        },

        // Request limits (protect the engine from pathological inputs)
        limits: {
            maxSwitches: readInt(env, 'MAX_SWITCHES_LIMIT', 5, { min: 0, max: 10 }),
            maxWaitMin: readInt(env, 'MAX_WAIT_LIMIT', 1200, { min: 30, max: 1469 }),
            maxTopK: readInt(env, 'MAX_TOPK_LIMIT', 50, { min: 1, max: 500 }),
            maxCityStations: 40
        },
        isWindows
    };
    if (!['local'].includes(config.routingAdapter)) {
        throw new Error(`Invalid ROUTING_ADAPTER=${JSON.stringify(config.routingAdapter)}: supported adapters are "local"`);
    }
    return Object.freeze(config);
}

module.exports = { loadConfig };
