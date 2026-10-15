/**
 * Retry policy for idempotent GET requests.
 *
 * The backend deliberately answers 429 (rate limited) and 503 (overloaded)
 * during spikes, with a Retry-After header. Retrying them, plus network
 * failures and proxy 502/504s, turns short spikes into a brief delay instead
 * of an error screen. Rules:
 *   - 429 / 503 are retried only when the server sends Retry-After (a 503
 *     without it means "unavailable", e.g. live status, and is returned as is);
 *   - wait what Retry-After says; otherwise exponential backoff with full
 *     jitter, so many clients do not retry in lockstep;
 *   - at most `maxRetries` retries, and never wait longer than `maxDelayMs`
 *     (a longer Retry-After is returned to the caller immediately);
 *   - an aborted request (AbortSignal) is never retried and stops any wait.
 */

export interface RetryOptions {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    /** Injectable for tests. */
    fetchImpl?: typeof fetch;
    sleep?: (ms: number, signal?: AbortSignal | null) => Promise<void>;
    random?: () => number;
    now?: () => number;
}

const RETRY_WITH_HEADER = new Set([429, 503]);
const RETRY_GATEWAY = new Set([502, 504]);

/** Retry-After in milliseconds (delta-seconds or HTTP-date), or null if absent/invalid. */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
    const date = Date.parse(trimmed);
    return Number.isNaN(date) ? null : Math.max(0, date - now);
}

function abortError(): Error {
    return new DOMException('The operation was aborted.', 'AbortError');
}

export function abortableSleep(ms: number, signal?: AbortSignal | null): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(abortError());
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(abortError());
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

const isAbort = (e: unknown) => e instanceof Error && e.name === 'AbortError';

export async function fetchWithRetry(url: string, init: RequestInit = {}, options: RetryOptions = {}): Promise<Response> {
    const {
        maxRetries = 2,
        baseDelayMs = 500,
        maxDelayMs = 10_000,
        fetchImpl = fetch,
        sleep = abortableSleep,
        random = Math.random,
        now = Date.now
    } = options;
    const method = (init.method || 'GET').toUpperCase();
    if (method !== 'GET') return fetchImpl(url, init);   // only idempotent requests are retried

    const backoff = (attempt: number) => Math.round(random() * Math.min(maxDelayMs, baseDelayMs * 2 ** attempt));

    for (let attempt = 0; ; attempt++) {
        let delay: number | null = null;
        try {
            const res = await fetchImpl(url, init);
            if (attempt >= maxRetries) return res;
            if (RETRY_WITH_HEADER.has(res.status)) {
                delay = parseRetryAfter(res.headers.get('retry-after'), now());
                if (delay === null || delay > maxDelayMs) return res;
            } else if (RETRY_GATEWAY.has(res.status)) {
                delay = backoff(attempt);
            } else {
                return res;
            }
            // Free the connection before waiting; the body is not needed.
            res.body?.cancel().catch(() => {});
        } catch (e) {
            if (isAbort(e) || init.signal?.aborted || attempt >= maxRetries) throw e;
            delay = backoff(attempt);                     // network failure
        }
        await sleep(delay, init.signal);
    }
}
