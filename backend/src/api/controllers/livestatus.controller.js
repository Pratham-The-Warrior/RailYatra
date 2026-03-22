const { spawn } = require('child_process');
const path = require('path');
const config = require('../../config');
const { transformLiveStatus } = require('../../services/transformer.service');


/**
 * Constants & Configuration
 */
const SCRAPER_PATH = path.join(__dirname, '..', '..', 'scripts', 'scraper.py');
const PYTHON_CMD = process.platform === 'win32' ? 'python' : 'python3';
const REQUEST_TIMEOUT_MS = 30000; // Total capped response time for user
const MAX_CONCURRENT_SCRAPES = 1;  // STRICT LIMIT: 1 active scraper at a time globally
const CACHE_TTL_MS = 60000;        // 60-second cache to prevent redundant queueing

/**
 * State Management (In-Memory)
 */
const inFlightRequests = new Map();  // trainNumber -> Promise (Request Coalescing)
const responseCache = new Map();     // trainNumber -> { data, timestamp }
let activeScrapersCount = 0;         // Tracks currently running Python processes
const scraperQueue = [];             // FIFO queue for pending scrapes

/**
 * Core Scraper Spawner
 */
const queryLiveStatus = (trainNumber) => {
    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        const proc = spawn(PYTHON_CMD, [SCRAPER_PATH, trainNumber], {
            timeout: 25000, // Process-level timeout (slightly less than global)
            cwd: path.join(__dirname, '..', '..', '..')
        });

        proc.stdout.on('data', (data) => stdout += data.toString());
        proc.stderr.on('data', (data) => stderr += data.toString());

        proc.on('close', (code) => {
            if (code !== 0) {
                const reason = code === null ? 'Timeout/Killed (25s limit)' : `Process failed with code ${code}`;
                console.error(`[Scraper Error]: ${reason}\nStderr: ${stderr}`);
                return reject(new Error(`Service busy or blocked. ${reason}. ${stderr.slice(0, 100)}`));
            }

            try {
                const jsonStart = stdout.indexOf('{');
                if (jsonStart === -1) throw new Error('No JSON output from scraper');
                const result = JSON.parse(stdout.substring(jsonStart).trim());
                resolve(result);
            } catch (e) {
                console.error(`[Parsing Error]: ${e.message}\nRaw: ${stdout}`);
                reject(new Error('Received malformed data from official sources'));
            }
        });

        proc.on('error', (err) => {
            console.error(`[Process Error]: ${err.message}`);
            reject(new Error('Internal Live Status engine failure'));
        });
    });
};

/**
 * Managed Execution (Queue + Pool)
 */
const enqueueScrape = (trainNumber) => {
    return new Promise((resolve, reject) => {
        const task = async () => {
            activeScrapersCount++;
            try {
                const result = await queryLiveStatus(trainNumber);
                resolve(result);
            } catch (err) {
                reject(err);
            } finally {
                activeScrapersCount--;
                processQueue();
                inFlightRequests.delete(trainNumber);
            }
        };

        scraperQueue.push(task);
        processQueue();
    });
};

const processQueue = () => {
    while (activeScrapersCount < MAX_CONCURRENT_SCRAPES && scraperQueue.length > 0) {
        const nextTask = scraperQueue.shift();
        nextTask();
    }
};

/**
 * Main Controller Handler
 */
exports.getTrainStatus = async (req, res) => {
    const { trainNumber } = req.params;

    // 1. Validation
    if (!/^\d{4,5}$/.test(trainNumber)) {
        return res.status(400).json({ error: 'Invalid train number. Provide a 4-5 digit numeric ID.' });
    }
    const normalizedNumber = trainNumber.padStart(5, '0');

    // 2. Check 60-Second TTL Cache FIRST
    if (responseCache.has(normalizedNumber)) {
        const cached = responseCache.get(normalizedNumber);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            const transformedData = transformLiveStatus(cached.data);
            return res.json(transformedData);
        } else {
            responseCache.delete(normalizedNumber); // Expired
        }
    }

    // 3. Handle Request Coalescing (Merging duplicate requests)
    if (inFlightRequests.has(normalizedNumber)) {
        try {
            const result = await inFlightRequests.get(normalizedNumber);
            const transformedData = transformLiveStatus(result);
            return res.json(transformedData);
        } catch (err) {
            return res.status(502).json({ error: err.message });
        }
    }

    // 4. Queue and Process with Capped Timeout

    const scrapePromise = enqueueScrape(normalizedNumber);
    inFlightRequests.set(normalizedNumber, scrapePromise);

    // Create a race between the scraper and a 30s timeout
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('RETRY_LATER')), REQUEST_TIMEOUT_MS);
    });

    try {
        const result = await Promise.race([scrapePromise, timeoutPromise]);

        if (result.error) {
            return res.status(502).json({ error: result.error });
        }

        // Save successful clean result to cache
        responseCache.set(normalizedNumber, { data: result, timestamp: Date.now() });

        // Transform for frontend
        const transformedData = transformLiveStatus(result);
        res.json(transformedData);

    } catch (err) {
        if (err.message === 'RETRY_LATER') {
            console.warn(`[LiveStatus]: Timeout reached for ${normalizedNumber}. Client must retry.`);
            return res.status(503).json({ error: 'Server is busy or data source is slow. Please try again in a few moments.' });
        }
        res.status(500).json({ error: err.message });
    }
};
