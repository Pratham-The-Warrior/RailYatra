import { describe, expect, it, vi } from 'vitest';
import { abortableSleep, fetchWithRetry, parseRetryAfter } from './retry';

const res = (status: number, headers: Record<string, string> = {}) =>
    new Response(status === 204 ? null : JSON.stringify({ status }), { status, headers });

/** fetch stub returning the given responses (or throwing given errors) in order. */
function scripted(...steps: Array<Response | Error>) {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => {
        calls.push(url);
        const step = steps.shift();
        if (!step) throw new Error('unexpected extra request');
        if (step instanceof Error) throw step;
        return step;
    }) as unknown as typeof fetch;
    return { fetchImpl, calls };
}

const sleepMock = () => vi.fn(async (_ms: number, _signal?: AbortSignal | null) => {});
const noSleep = { sleep: sleepMock(), random: () => 1 };

describe('parseRetryAfter', () => {
    it('reads delta-seconds and HTTP dates', () => {
        expect(parseRetryAfter('3')).toBe(3000);
        expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:05 GMT', Date.parse('Thu, 01 Jan 2026 00:00:00 GMT'))).toBe(5000);
        expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:00 GMT', Date.parse('Thu, 01 Jan 2026 00:01:00 GMT'))).toBe(0);
        expect(parseRetryAfter(null)).toBeNull();
        expect(parseRetryAfter('soon')).toBeNull();
    });
});

describe('fetchWithRetry', () => {
    it('returns successes and ordinary errors immediately', async () => {
        for (const status of [200, 400, 404, 500]) {
            const { fetchImpl, calls } = scripted(res(status));
            const r = await fetchWithRetry('/x', {}, { fetchImpl, ...noSleep });
            expect(r.status).toBe(status);
            expect(calls).toHaveLength(1);
        }
    });

    it('retries 429 and 503 after the Retry-After delay', async () => {
        for (const status of [429, 503]) {
            const sleep = sleepMock();
            const { fetchImpl, calls } = scripted(res(status, { 'Retry-After': '2' }), res(200));
            const r = await fetchWithRetry('/x', {}, { fetchImpl, sleep });
            expect(r.status).toBe(200);
            expect(calls).toHaveLength(2);
            expect(sleep).toHaveBeenCalledWith(2000, undefined);
        }
    });

    it('does not retry a 503 without Retry-After (feature unavailable, e.g. live status)', async () => {
        const { fetchImpl, calls } = scripted(res(503));
        expect((await fetchWithRetry('/x', {}, { fetchImpl, ...noSleep })).status).toBe(503);
        expect(calls).toHaveLength(1);
    });

    it('does not wait longer than maxDelayMs: a long Retry-After is returned to the caller', async () => {
        const { fetchImpl, calls } = scripted(res(429, { 'Retry-After': '60' }));
        expect((await fetchWithRetry('/x', {}, { fetchImpl, ...noSleep, maxDelayMs: 10_000 })).status).toBe(429);
        expect(calls).toHaveLength(1);
    });

    it('retries network failures and gateway errors with jittered exponential backoff', async () => {
        const sleep = sleepMock();
        const { fetchImpl, calls } = scripted(new TypeError('Failed to fetch'), res(502), res(200));
        const r = await fetchWithRetry('/x', {}, { fetchImpl, sleep, random: () => 0.5, baseDelayMs: 400 });
        expect(r.status).toBe(200);
        expect(calls).toHaveLength(3);
        expect(sleep.mock.calls.map((c) => c[0])).toEqual([200, 400]);   // 0.5 x 400, 0.5 x 800
    });

    it('gives up after maxRetries and returns (or throws) the last outcome', async () => {
        const a = scripted(res(503, { 'Retry-After': '1' }), res(503, { 'Retry-After': '1' }), res(503, { 'Retry-After': '1' }));
        expect((await fetchWithRetry('/x', {}, { fetchImpl: a.fetchImpl, ...noSleep, maxRetries: 2 })).status).toBe(503);
        expect(a.calls).toHaveLength(3);
        const b = scripted(new TypeError('down'), new TypeError('down'), new TypeError('still down'));
        await expect(fetchWithRetry('/x', {}, { fetchImpl: b.fetchImpl, ...noSleep, maxRetries: 2 })).rejects.toThrow('still down');
        expect(b.calls).toHaveLength(3);
    });

    it('never retries non-GET requests', async () => {
        const { fetchImpl, calls } = scripted(res(503, { 'Retry-After': '1' }));
        expect((await fetchWithRetry('/x', { method: 'POST' }, { fetchImpl, ...noSleep })).status).toBe(503);
        expect(calls).toHaveLength(1);
    });

    it('stops immediately when the request is aborted, including during the wait', async () => {
        const controller = new AbortController();
        const { fetchImpl, calls } = scripted(res(429, { 'Retry-After': '5' }), res(200));
        const pending = fetchWithRetry('/x', { signal: controller.signal }, { fetchImpl });
        await new Promise((r) => setTimeout(r, 10));
        controller.abort();
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
        expect(calls).toHaveLength(1);

        const aborted = new DOMException('aborted', 'AbortError');
        const c = scripted(aborted);
        await expect(fetchWithRetry('/x', {}, { fetchImpl: c.fetchImpl, ...noSleep })).rejects.toBe(aborted);
        expect(c.calls).toHaveLength(1);
    });
});

describe('abortableSleep', () => {
    it('resolves after the delay and rejects at once if already aborted', async () => {
        await expect(abortableSleep(5)).resolves.toBeUndefined();
        const c = new AbortController();
        c.abort();
        await expect(abortableSleep(1000, c.signal)).rejects.toMatchObject({ name: 'AbortError' });
    });
});
