import { describe, expect, it } from 'vitest';
import { formatPath, parsePath } from './routing';

describe('parsePath', () => {
    it('maps known paths to views', () => {
        expect(parsePath('/')).toEqual({ page: 'home', trainNumber: null, category: null });
        expect(parsePath('/schedules')).toEqual({ page: 'schedules', trainNumber: null, category: null });
        expect(parsePath('/schedules/12001')).toEqual({ page: 'schedules', trainNumber: '12001', category: null });
        expect(parsePath('/live-status/22436/')).toEqual({ page: 'live-status', trainNumber: '22436', category: null });
        expect(parsePath('/category/tejas')).toEqual({ page: 'category-routes', trainNumber: null, category: { id: 'tejas', name: 'Tejas' } });
    });

    it('falls back safely on unknown or malformed paths', () => {
        expect(parsePath('/nope').page).toBe('home');
        expect(parsePath('/category/unknown').page).toBe('home');
        expect(parsePath('/schedules/12001/extra').page).toBe('home');
        expect(parsePath('/schedules/<script>')).toEqual({ page: 'schedules', trainNumber: null, category: null });
    });
});

describe('formatPath', () => {
    it('round-trips every view', () => {
        for (const p of ['/', '/schedules', '/schedules/12001', '/live-status', '/live-status/22436', '/category/gatiman']) {
            expect(formatPath(parsePath(p))).toBe(p);
        }
    });
});
