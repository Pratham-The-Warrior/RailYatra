import React, { useState, useRef, useEffect } from 'react';
import {
    Search, Train, Clock,
    Activity, Radio,
    AlertTriangle, HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { LandingView } from '../components/LiveStatus/LandingView';
import { TrackingResults } from '../components/LiveStatus/TrackingResults';

// --- Types ---
interface StationTiming {
    sch_arr: string;
    act_arr: string;
    sch_dep: string;
    act_dep: string;
}

interface ItineraryItem {
    station: string;
    station_code: string;
    platform: string;
    status: string;
    is_delayed: boolean;
    is_source: boolean;
    is_destination: boolean;
    delay_mins?: number;
    timings: StationTiming;
    isPassed: boolean;
    isCurrent: boolean;
    isUpcoming: boolean;
    haltMins?: number;
    distance_km?: number;
}



interface LiveStatusMeta {
    train_no: string;
    start_date: string;
    current_location: string;
    fetched_at: string;
    status?: string;
    total_stations?: number;
}

export interface LiveStatusResponse {
    meta: LiveStatusMeta;
    itinerary: ItineraryItem[];
    activeIdx: number;
    isMoving: boolean;
    coveredStationsCount: number;
    totalStations: number;
    remainingTime: string;
    displayLocation: string;
    progressPercent: number;
    currentKM: number;
    avgSpeed: number;
    error?: string;
}




/* ─── Helpers ────────────────────────────────────────────────────────── */
export const titleCase = (s: string): string =>
    s.toLowerCase().split(' ')
        .map(w => w.length <= 2 && w !== 'jn' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .replace(/\bJn\b/gi, 'Jn');

export const parseTimeAndDate = (timeStr: string) => {
    if (!timeStr || timeStr === '--' || timeStr.includes('SOURCE') || timeStr.includes('DEST')) {
        return { time: timeStr, date: null };
    }
    const parts = timeStr.trim().split(/\s+/);
    if (parts.length > 1) {
        const timePart = parts.find(p => p.includes(':'));
        const datePart = parts.find(p => !p.includes(':'));
        return { time: timePart || timeStr, date: datePart || null };
    }
    return { time: timeStr, date: null };
};

/* ─── Popular trains ─────────────────────────────────────────────────── */
// (Removed popularTrains as it is handled inline in the UI)

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

            try {
                const stored = JSON.parse(localStorage.getItem('recent_live_status') || '[]');
                const newRecent = { trainNumber: data.meta.train_no, timestamp: Date.now() };
                const filtered = stored.filter((s: any) => s.trainNumber !== data.meta.train_no);
                filtered.unshift(newRecent);
                localStorage.setItem('recent_live_status', JSON.stringify(filtered.slice(0, 5)));
            } catch (e) {
                console.error('Failed to save recent search to localStorage', e);
            }

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
            <LandingView
                trainNumber={trainNumber}
                setTrainNumber={setTrainNumber}
                onSubmit={handleSubmit}
                onTrack={(num: string) => { setTrainNumber(num); fetchLiveStatus(num); }}
                onNavigate={onNavigate}
            />
        );
    }

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  LOADING STATE                                                      */
    /* ═══════════════════════════════════════════════════════════════════ */
    if (loading) {
        return (
            <div className="min-h-screen pt-20 md:pt-24 pb-12 md:pb-20 bg-[#f5f6f8] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="text-center"
                >
                    <div className="relative w-16 h-16 mx-auto mb-5">
                        <div className="w-16 h-16 rounded-full border-[3px] border-emerald-100 border-t-emerald-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
                        </div>
                    </div>
                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                        className="text-slate-500 font-medium text-sm"
                    >
                        Fetching live status for {trainNumber}…
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                        className="text-slate-400 text-xs mt-1"
                    >
                        Connecting to official servers
                    </motion.p>
                </motion.div>
            </div>
        );
    }
    if (!statusData) {
        return (
            <div className="min-h-screen pt-24 pb-20 bg-[#f8fafc] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="max-w-md w-full mx-auto px-6 text-center"
                >
                    <div className="w-20 h-20 bg-orange-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-orange-500/10">
                        <Search className="w-10 h-10 text-orange-500" />
                    </div>
                    <h2 className="font-outfit text-3xl font-black text-slate-900 mb-4 tracking-tight">Track Live Status</h2>
                    <p className="text-slate-500 text-base leading-relaxed mb-10">
                        Enter a train number above to get real-time location, platform info, and delay updates.
                    </p>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <Clock className="w-5 h-5 text-emerald-500" />
                            <div className="text-left">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">REAL-TIME DATA</p>
                                <p className="text-sm font-bold text-slate-700">Official NTES Updates</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <Train className="w-5 h-5 text-orange-500" />
                            <div className="text-left">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">LIVE TIMELINE</p>
                                <p className="text-sm font-bold text-slate-700">Full Route Tracking</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  RESULTS VIEW - FINAL V4 DESIGN                                     */
    /* ═══════════════════════════════════════════════════════════════════ */
    return (
        <TrackingResults
            statusData={statusData}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onBack={() => setStatusData(null)}
            resultsRef={resultsRef}
        />
    );
};
