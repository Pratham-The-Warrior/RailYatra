import React, { useState, useRef, useEffect } from 'react';
import {
    Search, ArrowRight, ArrowLeft, Train, Sparkles, Clock, MapPin,
    Lightbulb, Activity, RefreshCw, Radio, AlertTriangle, CheckCircle2, HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ─── Types ──────────────────────────────────────────────────────────── */
interface StationTiming {
    sch_arr: string;
    act_arr: string;
    sch_dep: string;
    act_dep: string;
}

interface ItineraryItem {
    station: string;
    platform: string;
    status: string;
    is_delayed: boolean;
    is_source: boolean;
    is_destination: boolean;
    timings: StationTiming;
}

interface LiveStatusMeta {
    train_no: string;
    start_date: string;
    current_location: string;
    fetched_at: string;
    status?: string;
    total_stations?: number;
}

interface LiveStatusResponse {
    meta: LiveStatusMeta;
    itinerary: ItineraryItem[];
    error?: string;
}

interface RecentLiveSearch {
    trainNumber: string;
    timestamp: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
const RECENT_KEY = 'railyatra_recent_livestatus';

const loadRecents = (): RecentLiveSearch[] => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};

const saveRecent = (trainNumber: string) => {
    let recents = loadRecents().filter(r => r.trainNumber !== trainNumber);
    recents.unshift({ trainNumber, timestamp: Date.now() });
    if (recents.length > 5) recents = recents.slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
};

const titleCase = (s: string): string =>
    s.toLowerCase().split(' ')
        .map(w => w.length <= 2 && w !== 'jn' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .replace(/\bJn\b/gi, 'Jn');

/* ─── Popular trains ─────────────────────────────────────────────────── */
const popularTrains = [
    { number: '22436', name: 'Vande Bharat Express', tag: 'PREMIUM', tagColor: 'text-orange-600 bg-orange-50', icon: '🚄' },
    { number: '12301', name: 'Rajdhani Express', tag: 'EXPRESS', tagColor: 'text-emerald-600 bg-emerald-50', icon: '🚆' },
    { number: '12001', name: 'Shatabdi Express', tag: 'SUPERFAST', tagColor: 'text-emerald-600 bg-emerald-50', icon: '🚃' },
    { number: '12213', name: 'Duronto Express', tag: 'INTERCITY', tagColor: 'text-blue-600 bg-blue-50', icon: '🚋' },
];

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                        */
/* ═══════════════════════════════════════════════════════════════════════ */
interface LiveStatusProps {
    onNavigate?: (page: 'home' | 'schedules' | 'live-status' | 'category-routes') => void;
    initialTrainNumber?: string | null;
}

export const LiveStatus: React.FC<LiveStatusProps> = ({ onNavigate, initialTrainNumber }) => {
    const [trainNumber, setTrainNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusData, setStatusData] = useState<LiveStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recents, setRecents] = useState<RecentLiveSearch[]>(loadRecents());
    const [refreshing, setRefreshing] = useState(false);
    const initialFetchDone = useRef(false);
    const resultsRef = useRef<HTMLDivElement>(null);

    /* ── fetch ── */
    const fetchLiveStatus = async (num: string) => {
        if (!num.trim()) return;
        setLoading(true);
        setError(null);
        setStatusData(null);

        try {
            // Minimum spinner time so cached responses don't flash
            const minSpinner = new Promise(r => setTimeout(r, 1500));

            let res: Response;
            try {
                [res] = await Promise.all([
                    fetch(`/api/livestatus/${num.trim()}`),
                    minSpinner
                ]) as [Response, unknown];
            } catch {
                throw new Error('Unable to connect to the server. Please try again later.');
            }

            let data: LiveStatusResponse;
            try {
                data = await res.json();
            } catch {
                throw new Error('Unable to connect to the server. Please try again later.');
            }

            if (!res.ok) {
                throw new Error((data as any).error || 'Failed to fetch live status');
            }

            if (data.error) {
                throw new Error(data.error);
            }

            setStatusData(data);
            saveRecent(num.trim());
            setRecents(loadRecents());
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        if (statusData?.meta?.train_no) {
            setRefreshing(true);
            fetchLiveStatus(statusData.meta.train_no);
        }
    };

    /* ── initial fetch ── */
    useEffect(() => {
        if (initialTrainNumber && !initialFetchDone.current) {
            setTrainNumber(initialTrainNumber);
            fetchLiveStatus(initialTrainNumber);
            initialFetchDone.current = true;
        }
    }, [initialTrainNumber]);

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); fetchLiveStatus(trainNumber); };
    const handleBack = () => { setStatusData(null); setError(null); };

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  ERROR VIEW                                                         */
    /* ═══════════════════════════════════════════════════════════════════ */
    if (error && !statusData && !loading) {
        return (
            <div className="min-h-screen pt-20 md:pt-24 pb-12 md:pb-20 bg-[#f5f6f8] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [.22, 1, .36, 1] }}
                    className="bg-white rounded-2xl md:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full mx-4 p-6 md:p-10 text-center"
                >
                    <div className="flex justify-center mb-7">
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-red-50 flex items-center justify-center relative">
                            <div className="w-16 h-16 rounded-xl bg-white shadow-sm border border-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-red-400" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/30">
                                <Activity className="w-4 h-4 text-white" />
                            </div>
                        </div>
                    </div>

                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 font-display mb-2 md:mb-3">
                        Couldn't Fetch Status
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-xs mx-auto">
                        {error}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                        <button
                            onClick={() => { setError(null); }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-md shadow-orange-500/20 active:scale-[0.97]"
                        >
                            <Search className="w-4 h-4" />
                            Try Another Search
                        </button>
                        <button
                            onClick={() => onNavigate?.('home')}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-600 font-bold px-6 py-3 rounded-xl text-sm transition-all hover:bg-slate-50 active:scale-[0.97]"
                        >
                            Back to Home
                        </button>
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                        <p className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Official records may be temporarily unavailable
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  SEARCH / LANDING VIEW                                              */
    /* ═══════════════════════════════════════════════════════════════════ */
    if (!statusData && !loading) {
        return (
            <div className="min-h-screen pb-12 md:pb-20 bg-[#f5f6f8]">
                {/* HERO */}
                <div className="relative overflow-hidden pt-24 md:pt-32">
                    <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-transparent" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-emerald-50/80 to-transparent rounded-full blur-3xl opacity-60" />

                    {onNavigate && (
                        <div className="max-w-[1120px] mx-auto px-4 md:px-5 relative z-10 w-full flex justify-start mb-4 md:mb-6">
                            <button
                                onClick={() => onNavigate('home')}
                                className="inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 text-slate-600 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm active:scale-[0.97]"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Home
                            </button>
                        </div>
                    )}

                    <div className="relative max-w-[1120px] mx-auto px-4 md:px-5 pb-10 md:pb-14 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.05 }}
                            className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4"
                        >
                            <Radio className="w-3 h-3 animate-pulse" />
                            LIVE TRACKING
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-2xl sm:text-3xl md:text-[48px] font-extrabold text-slate-900 font-display leading-[1.15] mb-3 md:mb-5 tracking-tight"
                        >
                            Track Your Train{' '}
                            <span className="text-emerald-500">Live</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-slate-500 text-sm md:text-lg max-w-lg mx-auto leading-relaxed mb-6 md:mb-10 px-2 md:px-0"
                        >
                            Get real-time running status, platform updates, and delay information for any Indian Railways train.
                        </motion.p>

                        {/* Search Bar */}
                        <motion.form
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            onSubmit={handleSubmit}
                            className="max-w-2xl mx-auto mb-5"
                        >
                            <div className="relative">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={trainNumber}
                                    onChange={e => setTrainNumber(e.target.value)}
                                    placeholder="Enter Train Number (e.g. 12301)"
                                    className="w-full bg-white border border-slate-200 rounded-xl md:rounded-2xl py-4 md:py-5 pl-11 md:pl-14 pr-20 md:pr-36 text-sm md:text-base font-medium text-slate-900 shadow-lg shadow-slate-200/40 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all placeholder:text-slate-400"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 md:gap-2 px-4 md:px-8 py-2.5 md:py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm md:text-[15px] font-bold rounded-lg md:rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-[0.97]"
                                >
                                    Track
                                    <Activity className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.form>

                        {/* Recent / Popular hints */}
                        <div className="flex items-center justify-center gap-3 md:gap-5 text-xs md:text-sm text-slate-400 px-2">
                            {recents.length > 0 && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Recent:{' '}
                                    <span
                                        className="text-slate-500 font-medium cursor-pointer hover:text-emerald-500 transition-colors"
                                        onClick={() => { setTrainNumber(recents[0].trainNumber); fetchLiveStatus(recents[0].trainNumber); }}
                                    >
                                        {recents[0].trainNumber}
                                    </span>
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Popular:{' '}
                                <span
                                    className="text-slate-500 font-medium cursor-pointer hover:text-emerald-500 transition-colors"
                                    onClick={() => { setTrainNumber('12301'); fetchLiveStatus('12301'); }}
                                >
                                    Rajdhani Exp
                                </span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* CONTENT GRID */}
                <div className="max-w-[1120px] mx-auto px-4 md:px-5">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 md:gap-7">
                        {/* LEFT — Popular Trains + Recents */}
                        <div className="space-y-6 md:space-y-8">
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 font-display">
                                        <Sparkles className="w-5 h-5 text-emerald-500" />
                                        Popular Trains
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                                    {popularTrains.map(t => (
                                        <button
                                            key={t.number}
                                            onClick={() => { setTrainNumber(t.number); fetchLiveStatus(t.number); }}
                                            className="flex items-center gap-3 md:gap-4 bg-white border border-slate-200/80 rounded-xl px-4 md:px-5 py-4 md:py-5 text-left hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/40 transition-all group active:scale-[0.98]"
                                        >
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg md:text-xl group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors">
                                                {t.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${t.tagColor} px-2 py-0.5 rounded`}>
                                                    {t.tag}
                                                </span>
                                                <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{t.name}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45 }}>
                                <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 font-display mb-4">
                                    <Clock className="w-5 h-5 text-slate-400" />
                                    Recent Searches
                                </h2>
                                {recents.length === 0 ? (
                                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl px-6 py-10 text-center">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-100/80 flex items-center justify-center mx-auto mb-3">
                                            <Activity className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <p className="text-sm text-slate-500 italic">No recent live status checks yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {recents.map(r => (
                                            <button
                                                key={r.trainNumber}
                                                onClick={() => { setTrainNumber(r.trainNumber); fetchLiveStatus(r.trainNumber); }}
                                                className="w-full flex items-center gap-3 bg-white border border-slate-200/80 rounded-xl px-4 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                                    <Train className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">Train {r.trainNumber}</p>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 transition-colors shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* RIGHT — Tips */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="space-y-6">
                            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
                                <h3 className="flex items-center gap-2.5 text-base font-bold text-slate-900 font-display mb-5">
                                    <Lightbulb className="w-4 h-4 text-emerald-500" />
                                    Pro Tips
                                </h3>
                                <div className="space-y-4">
                                    {[
                                        { num: '1', title: 'Real-time data:', desc: 'Status is fetched live from official sources. Allow a few seconds for the data to load.' },
                                        { num: '2', title: 'Yesterday\'s train:', desc: 'If a train started yesterday but is still running, we auto-detect and show the correct status.' },
                                        { num: '3', title: 'Refresh often:', desc: 'Hit the refresh button on the results page to get the latest position update.' },
                                    ].map(tip => (
                                        <div key={tip.num} className="flex gap-3">
                                            <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[11px] font-bold text-emerald-600 shrink-0 mt-0.5">
                                                {tip.num}
                                            </span>
                                            <p className="text-[13px] text-slate-600 leading-relaxed">
                                                <strong className="text-slate-900">{tip.title}</strong>{' '}{tip.desc}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
                                <h3 className="text-lg font-bold mb-2">Need a Schedule?</h3>
                                <p className="text-emerald-100 text-sm leading-relaxed mb-5">
                                    View complete timetables with platform details and halt durations.
                                </p>
                                <button
                                    onClick={() => onNavigate?.('schedules')}
                                    className="w-full bg-white text-emerald-600 font-bold text-[15px] py-3.5 rounded-xl hover:bg-emerald-50 transition-colors active:scale-[0.97] shadow-sm"
                                >
                                    View Schedules
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  LOADING STATE                                                      */
    /* ═══════════════════════════════════════════════════════════════════ */
    if (loading) {
        return (
            <div className="min-h-screen pt-20 md:pt-24 pb-12 md:pb-20 bg-[#f5f6f8] flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-5">
                        <div className="w-16 h-16 rounded-full border-[3px] border-emerald-100 border-t-emerald-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
                        </div>
                    </div>
                    <p className="text-slate-500 font-medium text-sm">Fetching live status for {trainNumber}…</p>
                    <p className="text-slate-400 text-xs mt-1">Connecting to official servers</p>
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  RESULTS VIEW                                                       */
    /* ═══════════════════════════════════════════════════════════════════ */
    const meta = statusData!.meta;
    const itinerary = statusData!.itinerary;
    const isYetToStart = meta.status === 'Yet to start' || itinerary.length === 0;

    return (
        <div className="min-h-screen pt-20 md:pt-24 pb-12 md:pb-20 bg-[#f5f6f8]">
            <div ref={resultsRef} className="max-w-[1120px] mx-auto px-3 md:px-5">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [.22, 1, .36, 1] }}
                >
                    {/* Top bar */}
                    <div className="flex items-center gap-3 mb-4 md:mb-5">
                        <button onClick={handleBack} className="text-sm text-slate-500 hover:text-emerald-500 font-medium transition-colors flex items-center gap-1.5">
                            ← Back
                        </button>
                        <form onSubmit={handleSubmit} className="relative ml-auto max-w-[180px] md:max-w-[220px] hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={trainNumber}
                                onChange={e => setTrainNumber(e.target.value)}
                                placeholder="Train Number"
                                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-all placeholder:text-slate-400"
                            />
                        </form>
                    </div>

                    {/* ═══ HEADER CARD ═══ */}
                    <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 md:p-7 mb-4 md:mb-5">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-[3px] rounded-full border leading-none ${
                                        isYetToStart
                                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                                            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                    }`}>
                                        <Radio className="w-3 h-3 animate-pulse" />
                                        {isYetToStart ? 'Yet to Start' : 'Running'}
                                    </span>
                                </div>
                                <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 leading-tight font-display tracking-tight">
                                    Train {meta.train_no}
                                </h1>
                                {!isYetToStart && (
                                    <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm font-medium text-slate-500">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span className="text-slate-700 font-semibold">{meta.current_location}</span>
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                                    <span>Started: {meta.start_date}</span>
                                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                    <span>Updated: {meta.fetched_at}</span>
                                    {meta.total_stations && (
                                        <>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                            <span>{meta.total_stations} stations</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 md:gap-2.5 shrink-0 mt-2 lg:mt-0">
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 md:px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm shadow-emerald-500/15 active:scale-[0.97] disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                                <button
                                    onClick={() => { if (onNavigate) onNavigate('schedules'); }}
                                    className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 md:px-5 py-2.5 rounded-lg text-sm transition-all active:scale-[0.97]"
                                >
                                    <Clock className="w-4 h-4" />
                                    Schedule
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ═══ YET TO START ═══ */}
                    {isYetToStart && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 md:p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-8 h-8 text-amber-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Train Yet to Start</h3>
                            <p className="text-slate-500 text-sm max-w-md mx-auto">
                                This train has not started its journey yet for {meta.start_date}. Please check back closer to departure time.
                            </p>
                        </div>
                    )}

                    {/* ═══ ITINERARY TIMELINE ═══ */}
                    {itinerary.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 md:gap-5 items-start">
                            <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                                <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-slate-100">
                                    <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-emerald-500" />
                                        Live Itinerary
                                    </h2>
                                    <span className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">{itinerary.length} Stops</span>
                                </div>

                                <div className="p-4 md:p-6 space-y-0">
                                    {itinerary.map((stop, idx) => {
                                        const isFirst = stop.is_source;
                                        const isLast = stop.is_destination;
                                        const isDelayed = stop.is_delayed;

                                        return (
                                            <div key={idx} className="relative flex gap-3 md:gap-4 group">
                                                {/* Timeline line + dot */}
                                                <div className="flex flex-col items-center shrink-0 w-8 md:w-10">
                                                    {/* Dot */}
                                                    <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-[2.5px] shrink-0 z-10 ${
                                                        isFirst ? 'bg-emerald-500 border-emerald-500' :
                                                        isLast ? 'bg-orange-500 border-orange-500' :
                                                        isDelayed ? 'bg-white border-red-400' :
                                                        'bg-white border-emerald-400'
                                                    }`}>
                                                        {(isFirst || isLast) && (
                                                            <div className="w-full h-full rounded-full flex items-center justify-center">
                                                                {isFirst && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                                {isLast && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Vertical line */}
                                                    {!isLast && (
                                                        <div className={`w-0.5 flex-1 min-h-[24px] ${isDelayed ? 'bg-red-100' : 'bg-emerald-100'}`} />
                                                    )}
                                                </div>

                                                {/* Station content */}
                                                <div className={`flex-1 pb-5 md:pb-6 ${isLast ? 'pb-0' : ''}`}>
                                                    <div className="bg-slate-50/50 rounded-xl md:rounded-2xl border border-slate-100 p-3.5 md:p-5 hover:bg-slate-50 transition-colors group-hover:border-slate-200">
                                                        {/* Station name + status */}
                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h3 className="text-sm md:text-base font-bold text-slate-900 truncate">{titleCase(stop.station)}</h3>
                                                                    {isFirst && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Source</span>}
                                                                    {isLast && <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Destination</span>}
                                                                </div>
                                                                {stop.platform !== 'N/A' && (
                                                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Platform {stop.platform}</p>
                                                                )}
                                                            </div>
                                                            <span className={`inline-flex items-center gap-1 text-[10px] md:text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                                                                isDelayed
                                                                    ? 'bg-red-50 text-red-600 border border-red-100'
                                                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                            }`}>
                                                                {isDelayed ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                                                {stop.status}
                                                            </span>
                                                        </div>

                                                        {/* Timings grid */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {/* Arrival */}
                                                            <div className="space-y-1">
                                                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arrival</p>
                                                                {stop.timings.sch_arr === 'SOURCE' ? (
                                                                    <p className="text-xs font-semibold text-slate-300 italic">—</p>
                                                                ) : (
                                                                    <div className="flex items-baseline gap-2">
                                                                        <span className="text-sm md:text-base font-bold text-slate-800">{stop.timings.act_arr}</span>
                                                                        {stop.timings.sch_arr !== stop.timings.act_arr && (
                                                                            <span className="text-[10px] text-slate-400 line-through">{stop.timings.sch_arr}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Departure */}
                                                            <div className="space-y-1">
                                                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departure</p>
                                                                {stop.timings.sch_dep === 'DEST' ? (
                                                                    <p className="text-xs font-semibold text-slate-300 italic">—</p>
                                                                ) : (
                                                                    <div className="flex items-baseline gap-2">
                                                                        <span className="text-sm md:text-base font-bold text-slate-800">{stop.timings.act_dep}</span>
                                                                        {stop.timings.sch_dep !== stop.timings.act_dep && (
                                                                            <span className="text-[10px] text-slate-400 line-through">{stop.timings.sch_dep}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ═══ SIDEBAR ═══ */}
                            <div className="space-y-5">
                                {/* Current Location Card */}
                                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 md:p-6 text-white shadow-lg shadow-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Radio className="w-4 h-4 animate-pulse" />
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">Current Location</span>
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold leading-snug mb-4">{meta.current_location}</h3>
                                    <button
                                        onClick={handleRefresh}
                                        disabled={refreshing}
                                        className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold text-sm py-2.5 rounded-xl transition-colors active:scale-[0.97] flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                        Refresh Status
                                    </button>
                                </div>

                                {/* Journey Summary */}
                                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
                                    <h3 className="text-sm font-bold text-slate-900 mb-4">Journey Summary</h3>
                                    <div className="space-y-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                                                <MapPin className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-slate-400 font-medium leading-none mb-1">Total Stations</p>
                                                <p className="text-base font-bold text-slate-900 leading-none">{itinerary.length}</p>
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-100" />
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                                                <Train className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-slate-400 font-medium leading-none mb-1">Source</p>
                                                <p className="text-base font-bold text-slate-900 leading-none">{titleCase(itinerary[0]?.station || '--')}</p>
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-100" />
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                                                <MapPin className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-slate-400 font-medium leading-none mb-1">Destination</p>
                                                <p className="text-base font-bold text-slate-900 leading-none">{titleCase(itinerary[itinerary.length - 1]?.station || '--')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Delay count */}
                                {(() => {
                                    const delayCount = itinerary.filter(s => s.is_delayed).length;
                                    if (delayCount === 0) return (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                            <p className="text-sm font-bold text-emerald-700">All stations on time!</p>
                                        </div>
                                    );
                                    return (
                                        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                                            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                            <p className="text-sm font-bold text-red-700">{delayCount} station{delayCount > 1 ? 's' : ''} delayed</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};
