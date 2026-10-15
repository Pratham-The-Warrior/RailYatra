const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

/**
 * Local engine pool: the default RoutingPort adapter.
 *
 * Runs `config.enginePoolSize` independent C++ engine processes (each ~55 MB)
 * and dispatches every request to the worker with the fewest in-flight
 * requests. A crashed worker only affects its own in-flight requests, which
 * are rejected immediately; the worker is respawned with backoff.
 *
 * reload(): a complete new pool is started on the current data file and
 * swapped in only once it is ready; the old pool drains its in-flight
 * requests and is then stopped. If the new pool fails, the old one keeps
 * serving. (Cache invalidation is the caller's job: see container.reloadData.)
 */

/** Short content hash of the timetable file, exposed as X-Data-Version. */
function hashFile(file) {
    return new Promise((resolve, reject) => {
        const h = crypto.createHash('sha256');
        fs.createReadStream(file)
            .on('data', (d) => h.update(d))
            .on('error', reject)
            .on('end', () => resolve(h.digest('hex').slice(0, 12)));
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function createEnginePool({ config, log, metrics, spawnProcess = spawn }) {
    let workers = [];
    let starting = [];          // pool being started by a reload (not yet serving)
    let shuttingDown = false;
    let dataVersion = null;
    let reloading = null;
    let liveProcesses = 0;      // every engine process we own, serving or not

    function createWorker(index) {
        const worker = {
            index,
            proc: null,
            ready: false,
            pending: new Map(),   // request_id -> { resolve, reject, timer }
            buffer: '',
            restarts: 0,
            retired: false,
            restartTimer: null
        };
        startWorker(worker);
        return worker;
    }

    function startWorker(worker) {
        worker.restartTimer = null;
        if (shuttingDown || worker.retired) return;
        log.info('engine spawning', { worker: worker.index, path: config.enginePath });
        const proc = spawnProcess(config.enginePath, [config.dataPath], { stdio: ['pipe', 'pipe', 'pipe'] });
        liveProcesses++;
        worker.proc = proc;
        worker.ready = false;
        worker.buffer = '';

        proc.on('error', (err) => {
            // ENOENT/EACCES etc. Without this handler Node crashes the whole server.
            log.error('engine failed to start', { worker: worker.index, err: err.message });
        });
        proc.stdin.on('error', (err) => {
            log.error('engine stdin error', { worker: worker.index, err: err.message });
        });

        proc.stdout.on('data', (data) => onStdout(worker, data));
        // Readiness marker may arrive split across stderr chunks; keep a short tail.
        let stderrTail = '';
        proc.stderr.on('data', (data) => {
            const text = data.toString();
            stderrTail = (stderrTail + text).slice(-256);
            if (!worker.ready && worker.proc === proc && stderrTail.includes('Ready for requests')) {
                log.info('engine ready', { worker: worker.index });
                worker.ready = true;
                worker.restarts = 0;
            }
            if (config.engineVerboseLogs) log.info('engine stderr', { worker: worker.index, text: text.trim() });
        });

        proc.on('close', (code) => {
            liveProcesses--;
            if (worker.proc !== proc) return;
            worker.ready = false;
            worker.proc = null;
            failPending(worker, new Error('Engine process exited'));
            if (shuttingDown || worker.retired) return;
            const delay = Math.min(30000, 1000 * 2 ** worker.restarts++);
            metrics.inc('engine_restarts_total');
            log.error('engine exited, restarting', { worker: worker.index, code, delayMs: delay });
            // startWorker re-checks retired/shuttingDown: a reload or shutdown
            // during this delay must not resurrect the worker as an orphan.
            worker.restartTimer = setTimeout(() => startWorker(worker), delay);
            worker.restartTimer.unref();
        });
    }

    function stopWorker(worker) {
        worker.retired = true;
        if (worker.restartTimer) {
            clearTimeout(worker.restartTimer);
            worker.restartTimer = null;
        }
        if (worker.proc) worker.proc.kill('SIGTERM');
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
                log.error('engine sent invalid JSON', { worker: worker.index, err: e.message });
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
            if (!w.ready || !w.proc) continue;
            if (!best || w.pending.size < best.pending.size) best = w;
        }
        return best;
    }

    /** Stops a worker once its in-flight requests finish (or after the timeout). */
    async function retire(worker) {
        worker.retired = true;
        const deadline = Date.now() + config.engineTimeoutMs;
        while (worker.pending.size > 0 && Date.now() < deadline) await sleep(50);
        stopWorker(worker);
    }

    return {
        /** Spawns the pool. Call once. */
        start() {
            workers = Array.from({ length: config.enginePoolSize }, (_, i) => createWorker(i));
            hashFile(config.dataPath)
                .then((v) => { if (!dataVersion) dataVersion = v; })
                .catch((e) => log.error('could not hash timetable', { err: e.message }));
        },

        /** Sends a request to the least-loaded engine worker. Resolves with `results` or the raw response. */
        request(payload) {
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
                    worker.proc.stdin.write(JSON.stringify({ ...payload, request_id: requestId }) + '\n');
                } catch (e) {
                    worker.pending.delete(requestId);
                    clearTimeout(timer);
                    reject(e);
                }
            });
        },

        /**
         * Zero-downtime timetable reload. Resolves with the new data version.
         * Concurrent calls share the same reload.
         */
        reload({ readyTimeoutMs = 120000 } = {}) {
            if (shuttingDown) return Promise.reject(new Error('Engine pool is shutting down'));
            if (reloading) return reloading;
            reloading = (async () => {
                const version = await hashFile(config.dataPath);
                log.info('timetable reload started', { from: dataVersion, to: version });
                starting = Array.from({ length: config.enginePoolSize }, (_, i) => createWorker(i));

                const deadline = Date.now() + readyTimeoutMs;
                while (!shuttingDown && !starting.every((w) => w.ready) && Date.now() < deadline) await sleep(50);
                if (shuttingDown || !starting.every((w) => w.ready)) {
                    starting.forEach(stopWorker);
                    starting = [];
                    metrics.inc('engine_reload_failures_total');
                    throw new Error('New engine pool did not become ready; keeping the current timetable');
                }

                const old = workers;
                workers = starting;
                starting = [];
                dataVersion = version;
                metrics.inc('engine_reloads_total');
                log.info('timetable reload complete', { version });
                old.forEach((w) => { retire(w); });
                return version;
            })().finally(() => { reloading = null; });
            return reloading;
        },

        /** Stops every engine. Resolves once all engine processes have exited (or after timeoutMs). */
        async shutdown({ timeoutMs = 5000 } = {}) {
            shuttingDown = true;
            for (const w of [...workers, ...starting]) {
                failPending(w, new Error('Server shutting down'));
                stopWorker(w);
            }
            const deadline = Date.now() + timeoutMs;
            while (liveProcesses > 0 && Date.now() < deadline) await sleep(20);
            return liveProcesses === 0;
        },

        isReady: () => workers.some((w) => w.ready),
        status: () => workers.map((w) => ({ index: w.index, ready: w.ready, inflight: w.pending.size, pid: w.proc ? w.proc.pid : null })),
        dataVersion: () => dataVersion,
        /** Engine processes currently alive (serving, starting or draining). */
        processCount: () => liveProcesses
    };
}

module.exports = { createEnginePool, hashFile };
