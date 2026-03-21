const { spawn } = require('child_process');
const config = require('../config');

let engineProcess = null;
let requestQueue = [];
let engineOutputBuffer = '';

/**
 * spawns the C++ core engine process.
 */
function spawnEngine() {
    console.log(`[Engine]: Spawning core engine: ${config.enginePath}`);
    engineProcess = spawn(config.enginePath, [config.dataDirPath]);

    engineProcess.stdout.on('data', (data) => {
        const output = data.toString();
        processEngineOutput(output);
    });

    engineProcess.stderr.on('data', (data) => {
        console.log(`[Engine Error]: ${data.toString().trim()}`);
    });

    engineProcess.on('close', (code) => {
        console.log(`[Engine]: Process exited with code ${code}. Restarting in 2s...`);
        setTimeout(spawnEngine, 2000);
    });
}

/**
 * Parses JSON output from the C++ engine.
 */
function processEngineOutput(output) {
    if (requestQueue.length === 0) return;

    engineOutputBuffer += output;

    let newlineIndex;
    while ((newlineIndex = engineOutputBuffer.indexOf('\n')) !== -1) {
        const line = engineOutputBuffer.slice(0, newlineIndex).trim();
        engineOutputBuffer = engineOutputBuffer.slice(newlineIndex + 1);

        if (!line.startsWith('{')) continue;

        try {
            const response = JSON.parse(line);
            const reqIdx = requestQueue.findIndex(r => r.id === response.request_id);

            if (reqIdx !== -1) {
                const req = requestQueue[reqIdx];
                clearTimeout(req.timeout);
                req.resolve(response.results || response);
                requestQueue.splice(reqIdx, 1);
            }
        } catch (e) {
            console.error("[Engine Parsing Error]:", e.message);
        }
    }
}

/**
 * Sends a JSON request to the C++ engine over stdin.
 */
async function sendRequestToEngine(reqData) {
    if (!engineProcess) {
        throw new Error("Engine process is not running");
    }

    return new Promise((resolve, reject) => {
        const requestId = Date.now().toString();
        const payload = { ...reqData, request_id: requestId };

        const timeout = setTimeout(() => {
            const idx = requestQueue.findIndex(r => r.id === requestId);
            if (idx !== -1) {
                requestQueue.splice(idx, 1);
                console.error(`[Engine]: Request ${requestId} timed out`);
                reject(new Error("Engine request timed out"));
            }
        }, 30000);

        requestQueue.push({ id: requestId, resolve, reject, timeout });
        try {
            engineProcess.stdin.write(JSON.stringify(payload) + '\n');
        } catch (e) {
            console.error("[Engine]: Failed to write to engine stdin:", e);
            reject(e);
        }
    });
}

module.exports = {
    spawnEngine,
    sendRequestToEngine,
    getEngineProcess: () => engineProcess
};
