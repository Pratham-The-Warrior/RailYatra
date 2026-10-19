/**
 * URL <-> view mapping for the single-page app. Pure functions so they can be
 * unit-tested; App.tsx wires them to the History API.
 *
 *   /                      home
 *   /schedules[/12001]     train schedule
 *   /live-status[/12001]   where's my train
 *   /category/tejas        special-train collection
 */
export type Page = 'home' | 'schedules' | 'live-status' | 'category-routes';

export interface View {
    page: Page;
    trainNumber: string | null;
    category: { id: string; name: string } | null;
}

export const CATEGORIES: Record<string, string> = {
    vandebharat: 'Vande Bharat',
    tejas: 'Tejas',
    gatiman: 'Gatiman',
};

const HOME: View = { page: 'home', trainNumber: null, category: null };
const TRAIN = /^\d{1,5}$/;

export function parsePath(pathname: string): View {
    const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const [section, arg] = parts;
    if (parts.length > 2) return HOME;
    if (section === 'schedules' || section === 'live-status') {
        if (arg !== undefined && !TRAIN.test(arg)) return { page: section, trainNumber: null, category: null };
        return { page: section, trainNumber: arg ?? null, category: null };
    }
    if (section === 'category' && arg && CATEGORIES[arg]) {
        return { page: 'category-routes', trainNumber: null, category: { id: arg, name: CATEGORIES[arg] } };
    }
    return HOME;
}

export function formatPath(view: View): string {
    switch (view.page) {
        case 'schedules':
        case 'live-status':
            return `/${view.page}${view.trainNumber ? `/${encodeURIComponent(view.trainNumber)}` : ''}`;
        case 'category-routes':
            return view.category ? `/category/${encodeURIComponent(view.category.id)}` : '/';
        default:
            return '/';
    }
}
