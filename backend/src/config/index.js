const os = require('os');
const path = require('path');

const isWindows = process.platform === 'win32';
const engineFileName = isWindows ? 'route_engine.exe' : 'route_engine';

// Base directory for the entire project (RailYatra root)
// __dirname is backend/src/config
const projectRoot = path.join(__dirname, '..', '..', '..');

const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

module.exports = {
    port: process.env.PORT || 3000,
    projectRoot,
    enginePath: process.env.ENGINE_PATH || path.join(projectRoot, 'engine', engineFileName),
    dataDirPath: process.env.TRAIN_DATA_PATH || path.join(projectRoot, 'master_train_data.json'),
    pdfDirPath: path.join(projectRoot, 'train_pdf'),
    pdfBaseUrl: process.env.PDF_BASE_URL || null,

    // Engine pool: one process per CPU core by default (each holds ~55 MB).
    enginePoolSize: int(process.env.ENGINE_POOL_SIZE, Math.max(1, os.cpus().length)),
    engineTimeoutMs: int(process.env.ENGINE_TIMEOUT_MS, 10000),
    engineMaxQueuePerWorker: int(process.env.ENGINE_MAX_QUEUE, 200),
    engineVerboseLogs: process.env.ENGINE_VERBOSE_LOGS === '1',

    // Response caches
    routeCacheSize: int(process.env.ROUTE_CACHE_SIZE, 50000),
    routeCacheTtlMs: int(process.env.ROUTE_CACHE_TTL_MS, 30 * 60 * 1000),

    // Request limits (protect the engine from pathological inputs)
    limits: {
        maxSwitches: int(process.env.MAX_SWITCHES_LIMIT, 5),
        maxWaitMin: int(process.env.MAX_WAIT_LIMIT, 1200),
        maxTopK: int(process.env.MAX_TOPK_LIMIT, 50),
        maxCityStations: 40
    },
    isWindows
};
