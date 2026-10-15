const { spawn } = require('child_process');
const crypto = require('crypto');
const config = require('../config');
const metrics = require('./metrics');

/**
 * Engine pool.
 *
 * Runs `config.enginePoolSize` independent C++ engine processes (each ~55 MB)
 * and dispatches every request to the worker with the fewest in-flight
 * requests. A crashed worker only affects its own in-flight requests, which
 * are rejected immediately; the worker is respawned with backoff.
 */
const workers = [];
let shuttingDown = false;

function createWorker(index) {
    const worker = {
        index,
        proc: null,
        ready: false,
        pending: new Map(),   // request_id -> { resolve, reject, timer }
        buffer: '',
        restarts: 0
    };
    workers[index] = worker;
    startWorker(worker);
    return worker;
}

function startWorker(worker) {
    console.log(`[Engine ${worker.index}]: spawning ${config.enginePath}`);
    const proc = spawn(config.enginePath, [config.dataDirPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    worker.proc = proc;
    worker.ready = false;
    worker.buffer = '';

    proc.on('error', (err) => {
        // ENOENT/EACCES etc. Without this handler Node crashes the whole server.
        console.error(`[Engine ${worker.index}]: failed to start: ${err.message}`);
    });
    proc.stdin.on('error', (err) => {
        console.error(`[Engine ${worker.index}]: stdin error: ${err.message}`);
    });

    proc.stdout.on('data', (data) => onStdout(worker, data));
    proc.stderr.on('data', (data) => {
        const text = data.toString();
        if (text.includes('Ready for requests')) {
            worker.ready = true;
            worker.restarts = 0;
        }
        if (config.engineVerboseLogs) console.log(`[Engine ${worker.index}]: ${text.trim()}`);
    });

    proc.on('close', (code) => {
        worker.ready = false;
        worker.proc = null;
        failPending(worker, new Error('Engine process exited'));
        if (shuttingDown) return;
        const delay = Math.min(30000, 1000 * 2 ** worker.restarts++);
        metrics.inc('engine_restarts_total');
        console.error(`[Engine ${worker.index}]: exited with code ${code}. Restarting in ${delay}ms`);
        setTimeout(() => startWorker(worker), delay);
    });
}

function failPending(worker, err) {
    for (const [, req] of worker.pending) {
        clearTimeout(req.timer);
        req.reject(err);
    }
    worker.pending.clear();
}

function onStdout(worker, data) {
    worker.buffer += data.toString();
    let nl;
    while ((nl = worker.buffer.indexOf('\n')) !== -1) {
        const line = worker.buffer.slice(0, nl).trim();
        worker.buffer = worker.buffer.slice(nl + 1);
        if (!line.startsWith('{')) continue;
        let response;
        try {
            response = JSON.parse(line);
        } catch (e) {
            console.error(`[Engine ${worker.index}]: bad JSON from engine: ${e.message}`);
            continue;
        }
        const req = worker.pending.get(response.request_id);
        if (!req) continue; // timed out earlier
        worker.pending.delete(response.request_id);
        clearTimeout(req.timer);
        req.resolve(response.results !== undefined ? response.results : response);
    }
}

function pickWorker() {
    let best = null;
    for (const w of workers) {
        if (!w || !w.ready || !w.proc) continue;
        if (!best || w.pending.size < best.pending.size) best = w;
    }
    return best;
}

/** Spawns the engine pool. Safe to call once at startup. */
function spawnEngine() {
    for (let i = 0; i < config.enginePoolSize; i++) createWorker(i);
}

/** Sends a request to the least-loaded engine worker. */
function sendRequestToEngine(reqData) {
    const worker = pickWorker();
    if (!worker) {
        metrics.inc('engine_unavailable_total');
        return Promise.reject(Object.assign(new Error('Engine is not ready'), { status: 503 }));
    }
    // Backpressure: shed load instead of building unbounded queues.
    if (worker.pending.size >= config.engineMaxQueuePerWorker) {
        metrics.inc('engine_overload_total');
        return Promise.reject(Object.assign(new Error('Server busy, please retry'), { status: 503 }));
    }

    return new Promise((resolve, reject) => {
        const requestId = crypto.randomUUID();
        const started = process.hrtime.bigint();
        const timer = setTimeout(() => {
            if (worker.pending.delete(requestId)) {
                metrics.inc('engine_timeouts_total');
                reject(Object.assign(new Error('Engine request timed out'), { status: 504 }));
            }
        }, config.engineTimeoutMs);

        worker.pending.set(requestId, {
            timer,
            resolve: (v) => {
                metrics.observe('engine_request_ms', Number(process.hrtime.bigint() - started) / 1e6);
                resolve(v);
            },
            reject
        });
        try {
            worker.proc.stdin.write(JSON.stringify({ ...reqData, request_id: requestId }) + '\n');
        } catch (e) {
            worker.pending.delete(requestId);
            clearTimeout(timer);
            reject(e);
        }
    });
}

function shutdown() {
    shuttingDown = true;
    for (const w of workers) {
        if (w && w.proc) {
            failPending(w, new Error('Server shutting down'));
            w.proc.kill('SIGTERM');
        }
    }
}

function status() {
    return workers.map(w => ({ index: w.index, ready: w.ready, inflight: w.pending.size }));
}

module.exports = {
    spawnEngine,
    sendRequestToEngine,
    shutdown,
    status,
    isReady: () => workers.some(w => w && w.ready),
    getEngineProcess: () => (workers.find(w => w && w.proc) || {}).proc || null
};
