/**
 * Single source of truth for backend URLs (contract: docs/openapi.json).
 *
 * Each function builds the request and returns the raw Response, so callers
 * keep full control of their own loading and error handling. Components must
 * not hard-code /api paths; change an endpoint here and every caller follows.
 *
 * Read endpoints retry transient failures (429/503 with Retry-After, network
 * errors, 502/504) before returning; see ./retry.ts.
 */
import type { SearchParams } from '@/types';
import { fetchWithRetry } from './retry';

type TradeoffParams = Pick<SearchParams, 'from' | 'to' | 'date' | 'max_switches' | 'max_wait'>;

const toQuery = (params: Record<string, string | number>) =>
    new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();

export const api = {
    /** Ranked journeys. GET so identical searches are cacheable by URL at the CDN and browser. */
    routes: (params: SearchParams) =>
        fetchWithRetry(`/api/route?${toQuery({ ...params })}`),

    /** Best trade-offs: earliest arrival for each number of changes. */
    tradeoffs: ({ from, to, date, max_switches, max_wait }: TradeoffParams) =>
        fetchWithRetry(`/api/route/pareto?${toQuery({ from, to, date, max_switches, max_wait })}`),

    /** Station and city autocomplete. */
    stations: (query: string, init?: RequestInit) =>
        fetchWithRetry(`/api/stations?${toQuery({ q: query })}`, init),

    /** Full timetable of one train. */
    schedule: (trainNumber: string) =>
        fetchWithRetry(`/api/schedule/${encodeURIComponent(trainNumber)}`),

    /** Special-train collection, e.g. "vandebharat". */
    category: (categoryId: string) =>
        fetchWithRetry(`/api/category/${encodeURIComponent(categoryId)}`),

    /** Live running status (currently answers 503 until a data source exists; that 503 has no Retry-After, so it is not retried). */
    liveStatus: (trainNumber: string) =>
        fetchWithRetry(`/api/livestatus/${encodeURIComponent(trainNumber)}`),
};
