import React, { useState, useRef } from 'react';
import {
    Search, Calendar, FileText,
    ArrowRight, ArrowLeft, Wifi, UtensilsCrossed, Plug, Cross, Activity, HelpCircle,
    Train, Sparkles, Clock, MapPin, Lightbulb
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ─── Types ──────────────────────────────────────────────────────────── */
interface ScheduleItem {
    arrival_time: string | null;
    departure_time: string | null;
    day_of_journey: number;
    distance_km: number;
    station_code: string;
    station_name: string;
    sequence_number: number;
}

interface TrainSchedule {
    train_number: string;
    train_name: string;
    type: string;
    classes_available: string[];
    operating_days: Record<string, boolean>;
    schedule: ScheduleItem[];
    hasPdf: boolean;
    pdfUrl: string | null;
}

interface RecentSearch {
    trainNumber: string;
    trainName: string;
    timestamp: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
const RECENT_KEY = 'railyatra_recent_schedules';

const computeHalt = (arrival: string | null, departure: string | null): string => {
    if (!arrival || !departure) return '--';
    const [ah, am] = arrival.split(':').map(Number);
    const [dh, dm] = departure.split(':').map(Number);
    let diff = (dh * 60 + dm) - (ah * 60 + am);
    if (diff < 0) diff += 24 * 60;
    return `${diff} min`;
};

const titleCase = (s: string): string =>
    s.toLowerCase().split(' ')
        .map(w => w.length <= 2 && w !== 'jn' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .replace(/\bJn\.\b/gi, 'Jn')
        .replace(/\bJn\b/gi, 'Jn');

const loadRecents = (): RecentSearch[] => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};

const saveRecent = (trainNumber: string, trainName: string) => {
    let recents = loadRecents().filter(r => r.trainNumber !== trainNumber);
    recents.unshift({ trainNumber, trainName, timestamp: Date.now() });
    if (recents.length > 5) recents = recents.slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
};

/* ─── Popular trains data ────────────────────────────────────────────── */
const popularTrains = [
    { number: '22436', name: 'Vande Bharat Express', tag: 'PREMIUM', tagColor: 'text-orange-600 bg-orange-50', icon: '🚄' },
    { number: '12301', name: 'Rajdhani Express', tag: 'EXPRESS', tagColor: 'text-emerald-600 bg-emerald-50', icon: '🚆' },
    { number: '12001', name: 'Shatabdi Express', tag: 'SUPERFAST', tagColor: 'text-emerald-600 bg-emerald-50', icon: '🚃' },
    { number: '12213', name: 'Duronto Express', tag: 'INTERCITY', tagColor: 'text-blue-600 bg-blue-50', icon: '🚋' },
];

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                        */
/* ═══════════════════════════════════════════════════════════════════════ */
interface SchedulesProps {
    onNavigate?: (page: 'home' | 'schedules' | 'category-routes') => void;
    initialTrainNumber?: string | null;
}

export const Schedules: React.FC<SchedulesProps> = ({ onNavigate, initialTrainNumber }) => {
    const [trainNumber, setTrainNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState<TrainSchedule | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recents, setRecents] = useState<RecentSearch[]>(loadRecents());
    const initialFetchDone = useRef(false);

    const resultsRef = useRef<HTMLDivElement>(null);

    /* ── fetch ── */
    const fetchSchedule = async (num: string) => {
        if (!num.trim()) return;
        setLoading(true);
        setError(null);
        setSchedule(null);


        try {
            let res: Response;
            try {
                res = await fetch(`/api/schedule/${num.trim()}`);
            } catch {
                throw new Error('Unable to connect to the server. Sorry for the inconvenience.');
            }

            if (!res.ok) throw new Error(res.status === 404
                ? 'Train not found. Please check the number and try again.'
                : 'Something went wrong. Please try again.'
            );

            let data: TrainSchedule;
            try {
                data = await res.json();
            } catch {
                throw new Error('Unable to connect to the server. Sorry for the inconvenience.');
            }

            setSchedule(data);
            saveRecent(data.train_number, data.train_name);
            setRecents(loadRecents());
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    /* ── initial fetch ── */
    React.useEffect(() => {
        if (initialTrainNumber && !initialFetchDone.current) {
            setTrainNumber(initialTrainNumber);
            fetchSchedule(initialTrainNumber);
            initialFetchDone.current = true;
        }
    }, [initialTrainNumber]);

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); fetchSchedule(trainNumber); };
    const handleBack = () => { setSchedule(null); setError(null); };

    /* ── derived ── */
    const isDailyService = schedule?.operating_days ? Object.values(schedule.operating_days).every(Boolean) : false;
    const src = schedule?.schedule?.[0];
    const dest = schedule?.schedule?.[schedule.schedule.length - 1];

    const amenities = [
        { icon: UtensilsCrossed, label: 'Onboard Catering', color: '#ea580c' },
        { icon: Wifi, label: 'High Speed WiFi', color: '#2563eb' },
        { icon: Plug, label: 'Charging Points', color: '#ca8a04' },
        { icon: Cross, label: 'First Aid', color: '#dc2626' },
    ];

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  NOT FOUND / ERROR VIEW                                             */
    /* ═══════════════════════════════════════════════════════════════════ */
    if (error && !schedule && !loading) {
        return (
            <div className="min-h-screen pt-20 md:pt-24 pb-12 md:pb-20 bg-[#f5f6f8] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [.22, 1, .36, 1] }}
                    className="bg-white rounded-2xl md:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full mx-4 p-6 md:p-10 text-center"
                >
                    {/* Icon circle */}
                    <div className="flex justify-center mb-7">
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-slate-100 flex items-center justify-center relative">
                            <div className="w-16 h-16 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                                <Train className="w-8 h-8 text-slate-400" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/30">
                                <Search className="w-4 h-4 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Heading */}
                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 font-display mb-2 md:mb-3">
                        Oops! No Train Found
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-xs mx-auto">
                        We couldn't find any trains matching your search. Please check the train name or number and try again.
                    </p>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                        <button
                            onClick={() => { setError(null); }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-md shadow-orange-500/20 active:scale-[0.97]"
                        >
                            <Search className="w-4 h-4" />
                            Try Another Search
                        </button>
                        <button
                            onClick={() => { setError(null); }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border-2 border-emerald-500 text-emerald-600 font-bold px-6 py-3 rounded-xl text-sm transition-all hover:bg-emerald-50 active:scale-[0.97]"
                        >
                            <MapPin className="w-4 h-4" />
                            View Popular Routes
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 pt-5">
                        <p className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Need assistance with your booking?
                        </p>
                        <a href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-2 transition-colors">
                            Contact RailYatra Support
                        </a>
                    </div>
                </motion.div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  SEARCH/LANDING VIEW                                                */
    /* ═══════════════════════════════════════════════════════════════════ */
    if (!schedule && !loading) {
        return (
            <div className="min-h-screen pb-12 md:pb-20 bg-[#f5f6f8]">
                {/* ═══ HERO ═══ */}
                <div className="relative overflow-hidden pt-24 md:pt-32">
                    {/* Subtle gradient bg */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-transparent" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-orange-50/80 to-transparent rounded-full blur-3xl opacity-60" />

                    {/* ── Top bar: back ── */}
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
                        {/* Title */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-2xl sm:text-3xl md:text-[48px] font-extrabold text-slate-900 font-display leading-[1.15] mb-3 md:mb-5 tracking-tight"
                        >
                            Track Your Journey with{' '}
                            <span className="text-orange-500">RailYatra</span>
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-slate-500 text-sm md:text-lg max-w-lg mx-auto leading-relaxed mb-6 md:mb-10 px-2 md:px-0"
                        >
                            Access real-time schedules, platform info, and coach positions for all Indian passenger trains.
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
                                    placeholder="Enter Train-Number (e.g. 12002)"
                                    className="w-full bg-white border border-slate-200 rounded-xl md:rounded-2xl py-4 md:py-5 pl-11 md:pl-14 pr-20 md:pr-36 text-sm md:text-base font-medium text-slate-900 shadow-lg shadow-slate-200/40 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-slate-400"

                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 md:gap-2 px-4 md:px-8 py-2.5 md:py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm md:text-[15px] font-bold rounded-lg md:rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-[0.97]"
                                >
                                    Search
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.form>

                        {/* Recent / Popular links */}
                        <div className="flex items-center justify-center gap-3 md:gap-5 text-xs md:text-sm text-slate-400 px-2">
                            {recents.length > 0 && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Recent:{' '}
                                    <span
                                        className="text-slate-500 font-medium cursor-pointer hover:text-orange-500 transition-colors"
                                        onClick={() => { setTrainNumber(recents[0].trainNumber); fetchSchedule(recents[0].trainNumber); }}
                                    >
                                        {recents[0].trainNumber} {titleCase(recents[0].trainName)}
                                    </span>
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Popular:{' '}
                                <span
                                    className="text-slate-500 font-medium cursor-pointer hover:text-orange-500 transition-colors"
                                    onClick={() => { setTrainNumber('22436'); fetchSchedule('22436'); }}
                                >
                                    Vande Bharat
                                </span>
                            </span>
                        </div>


                    </div>
                </div>

                {/* ═══ CONTENT GRID ═══ */}
                <div className="max-w-[1120px] mx-auto px-4 md:px-5">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 md:gap-7">

                        {/* LEFT COLUMN */}
                        <div className="space-y-6 md:space-y-8">
                            {/* ── Popular Trains ── */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.3 }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 font-display">
                                        <Sparkles className="w-5 h-5 text-orange-500" />
                                        Popular Trains
                                    </h2>
                                    <button className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                                        View all
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                                    {popularTrains.map(t => (
                                        <button
                                            key={t.number}
                                            onClick={() => { setTrainNumber(t.number); fetchSchedule(t.number); }}
                                            className="flex items-center gap-3 md:gap-4 bg-white border border-slate-200/80 rounded-xl px-4 md:px-5 py-4 md:py-5 text-left hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100/40 transition-all group active:scale-[0.98]"
                                        >
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg md:text-xl group-hover:bg-orange-50 group-hover:border-orange-200 transition-colors">
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

                            {/* ── Recent Searches ── */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.45 }}
                            >
                                <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 font-display mb-4">
                                    <Clock className="w-5 h-5 text-slate-400" />
                                    Recent Searches
                                </h2>
                                {recents.length === 0 ? (
                                    <div className="bg-orange-50/50 border border-orange-100 rounded-xl px-6 py-10 text-center">
                                        <div className="w-12 h-12 rounded-xl bg-orange-100/80 flex items-center justify-center mx-auto mb-3">
                                            <Search className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <p className="text-sm text-slate-500 italic">
                                            No recent searches yet. Start by searching for a train number.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {recents.map(r => (
                                            <button
                                                key={r.trainNumber}
                                                onClick={() => { setTrainNumber(r.trainNumber); fetchSchedule(r.trainNumber); }}
                                                className="w-full flex items-center gap-3 bg-white border border-slate-200/80 rounded-xl px-4 py-3 text-left hover:border-orange-300 hover:bg-orange-50/30 transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                                    <Train className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                                        {r.trainNumber} – {titleCase(r.trainName)}
                                                    </p>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-400 transition-colors shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="space-y-6"
                        >
                            {/* ── Pro Tips ── */}
                            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
                                <h3 className="flex items-center gap-2.5 text-base font-bold text-slate-900 font-display mb-5">
                                    <Lightbulb className="w-4 h-4 text-emerald-500" />
                                    Pro Tips
                                </h3>
                                <div className="space-y-4">
                                    {[
                                        {
                                            num: '1',
                                            title: '5-digit magic:',
                                            desc: 'Enter the exact 5-digit train number for instant, more accurate results.'
                                        },
                                        {
                                            num: '2',
                                            title: 'Live Status:',
                                            desc: "Once you find a schedule, click 'Live Status' to see where the train is right now."
                                        },
                                        {
                                            num: '3',
                                            title: 'Offline Access:',
                                            desc: 'Save your most frequent schedules for offline viewing while traveling.'
                                        },
                                    ].map(tip => (
                                        <div key={tip.num} className="flex gap-3">
                                            <span className="w-6 h-6 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-[11px] font-bold text-orange-600 shrink-0 mt-0.5">
                                                {tip.num}
                                            </span>
                                            <p className="text-[13px] text-slate-600 leading-relaxed">
                                                <strong className="text-slate-900">{tip.title}</strong>{' '}{tip.desc}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Planning a Trip ── */}
                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20">
                                <h3 className="text-lg font-bold mb-2">Planning a Trip?</h3>
                                <p className="text-orange-100 text-sm leading-relaxed mb-5">
                                    Check PNR status and booking availability in one click.
                                </p>
                                <button className="w-full bg-white text-orange-600 font-bold text-[15px] py-3.5 rounded-xl hover:bg-orange-50 transition-colors active:scale-[0.97] shadow-sm">
                                    Check PNR Now
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
                    <div className="w-14 h-14 mx-auto rounded-full border-[3px] border-orange-100 border-t-orange-500 animate-spin mb-5" />
                    <p className="text-slate-500 font-medium text-sm">Loading schedule for {trainNumber}…</p>
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  RESULTS VIEW                                                       */
    /* ═══════════════════════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen pt-20 md:pt-24 pb-12 md:pb-20 bg-[#f5f6f8]">
            <div ref={resultsRef} className="max-w-[1120px] mx-auto px-3 md:px-5">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [.22, 1, .36, 1] }}
                >
                    {/* ── Top bar: back + mini search ── */}
                    <div className="flex items-center gap-3 mb-4 md:mb-5">
                        <button
                            onClick={handleBack}
                            className="text-sm text-slate-500 hover:text-orange-500 font-medium transition-colors flex items-center gap-1.5"
                        >
                            ← Back
                        </button>
                        <form onSubmit={handleSubmit} className="relative ml-auto max-w-[180px] md:max-w-[220px] hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={trainNumber}
                                onChange={e => setTrainNumber(e.target.value)}
                                placeholder="Train No / Name"
                                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100 transition-all placeholder:text-slate-400"
                            />
                        </form>
                    </div>

                    {/* ═══════ TRAIN HEADER ═══════ */}
                    <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 md:p-7 mb-4 md:mb-5">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                            <div className="space-y-2.5">
                                <span className={`inline-block text-[11px] font-bold px-2.5 py-[3px] rounded-full border leading-none ${isDailyService
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                    : 'text-orange-600 bg-orange-50 border-orange-200'
                                    }`}>
                                    {isDailyService ? 'Daily Service' : 'Limited Service'}
                                </span>
                                <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 leading-tight font-display tracking-tight">
                                    {schedule!.train_number} – {titleCase(schedule!.train_name)}
                                </h1>
                                {src && dest && (
                                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium text-slate-500">
                                        <span className="text-slate-700">{titleCase(src.station_name)} ({src.station_code})</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                        <span className="text-slate-700">{titleCase(dest.station_name)} ({dest.station_code})</span>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 md:gap-2.5 shrink-0 mt-4 lg:mt-0">
                                <button className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 md:px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm shadow-orange-500/15 active:scale-[0.97]">
                                    <Calendar className="w-4 h-4" />
                                    Check Availability
                                </button>
                                <button className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 md:px-5 py-2.5 rounded-lg text-sm transition-all active:scale-[0.97]">
                                    <Activity className="w-4 h-4" />
                                    Live Status
                                </button>
                                {schedule!.hasPdf && (
                                    <a href="#" target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2.5 rounded-lg text-sm transition-all active:scale-[0.97]">
                                        <FileText className="w-4 h-4" />
                                        Download PDF
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ═══════ AMENITY STRIP ═══════ */}
                    <div className="flex flex-wrap items-center gap-x-4 md:gap-x-8 gap-y-2 md:gap-y-3 pl-1 mb-5 md:mb-8">
                        {amenities.map(({ icon: Icon, label, color }) => (
                            <div key={label} className="flex items-center gap-1.5 md:gap-2.5 text-xs md:text-sm font-medium text-slate-600">
                                <Icon className="w-4 h-4 md:w-[18px] md:h-[18px]" style={{ color }} />
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* ═══════ MAIN GRID ═══════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 md:gap-5 items-start">
                        {/* ── TIMETABLE ── */}
                        <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900 font-display">Detailed Timetable</h2>
                                <span className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Effective Feb 2026</span>
                            </div>
                            <div className="overflow-x-auto">
                                <div className="min-w-full sm:min-w-[540px]">
                                    <div className="grid grid-cols-[1fr_100px] sm:grid-cols-[1fr_140px_72px_72px_64px] px-4 md:px-6 py-2.5 md:py-3 border-b border-slate-100 bg-slate-50/50">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Station</span>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Arrive/Depart</span>
                                        <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] text-center">Halt</span>
                                        <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] text-center">Dist.</span>
                                        <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] text-center">Day</span>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {schedule!.schedule.map((stop, idx) => {
                                            const isFirst = idx === 0;
                                            const isLast = idx === schedule!.schedule.length - 1;
                                            const halt = computeHalt(stop.arrival_time, stop.departure_time);

                                            let dotBg = 'bg-slate-300';
                                            if (isFirst || isLast) dotBg = 'bg-emerald-500';

                                            let ad = `${stop.arrival_time ?? '--'} / ${stop.departure_time ?? '--'}`;
                                            if (isFirst) ad = `Starts / ${stop.departure_time ?? '--'}`;
                                            if (isLast) ad = `${stop.arrival_time ?? '--'} / Ends`;



                                            return (
                                                <div key={stop.sequence_number || idx}
                                                    className="grid grid-cols-[1fr_100px] sm:grid-cols-[1fr_140px_72px_72px_64px] items-center px-4 md:px-6 py-3 md:py-4 transition-colors hover:bg-slate-50/60">
                                                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                                        <span className={`w-[8px] h-[8px] sm:w-[9px] sm:h-[9px] rounded-full ${dotBg} shrink-0`} />
                                                        <div className="min-w-0">
                                                            <p className="text-xs sm:text-sm font-semibold leading-tight truncate text-slate-800">{titleCase(stop.station_name)}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-[0.06em]">{stop.station_code}</p>
                                                                <span className="sm:hidden text-[10px] text-slate-300">•</span>
                                                                <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">Day {stop.day_of_journey}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col sm:block min-w-0">
                                                        <span className="text-xs sm:text-sm font-medium text-slate-600 truncate">{ad.replace('Starts / ', '').replace(' / Ends', '')}</span>
                                                        <div className="sm:hidden flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] text-slate-400">{halt === '--' ? 'No halt' : `Halt ${halt}`}</span>
                                                        </div>
                                                    </div>
                                                    <span className="hidden sm:inline-block text-xs md:text-sm font-medium text-center text-slate-500">{halt}</span>
                                                    <span className="hidden sm:inline-block text-xs md:text-sm font-medium text-center text-slate-500">{Math.round(stop.distance_km)} km</span>
                                                    <div className="hidden sm:flex justify-center">
                                                        <span className="text-[11px] font-bold px-2 py-[3px] rounded leading-none border border-slate-200 text-slate-600">
                                                            Day {stop.day_of_journey}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── SIDEBAR ── */}
                        <div className="space-y-5">
                            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                                        <HelpCircle className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 leading-snug">Need Help?</h3>
                                        <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">Talk to our travel experts for easy bookings.</p>
                                    </div>
                                </div>
                                <a href="#" className="text-orange-500 hover:text-orange-600 text-sm font-bold transition-colors">Contact Support</a>
                            </div>

                            {src && dest && (() => {
                                // Compute duration
                                const depTime = src.departure_time ?? '00:00';
                                const arrTime = dest.arrival_time ?? '00:00';
                                const [dh, dm] = depTime.split(':').map(Number);
                                const [ah, am] = arrTime.split(':').map(Number);
                                let totalMin = (ah * 60 + am) - (dh * 60 + dm) + (dest.day_of_journey - src.day_of_journey) * 24 * 60;
                                if (totalMin < 0) totalMin += 24 * 60;
                                const hours = Math.floor(totalMin / 60);
                                const mins = totalMin % 60;
                                const distKm = Math.round(dest.distance_km);
                                const avgSpeed = totalMin > 0 ? Math.round(distKm / (totalMin / 60)) : 0;

                                const stats = [
                                    { label: 'Total Distance', value: `${distKm} km`, color: 'bg-orange-500', icon: <MapPin className="w-4 h-4 text-white" /> },
                                    { label: 'Total Duration', value: `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`, color: 'bg-emerald-500', icon: <Clock className="w-4 h-4 text-white" /> },
                                    { label: 'Avg. Speed', value: `${avgSpeed} km/h`, color: 'bg-blue-500', icon: <Activity className="w-4 h-4 text-white" /> },
                                ];

                                return (
                                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
                                        <h3 className="text-sm font-bold text-slate-900 mb-5">Journey Stats</h3>
                                        <div className="space-y-4">
                                            {stats.map((stat, i) => (
                                                <React.Fragment key={stat.label}>
                                                    <div className="flex items-center gap-3.5">
                                                        <div className={`w-9 h-9 rounded-full ${stat.color} flex items-center justify-center shrink-0 shadow-sm`}>
                                                            {stat.icon}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] text-slate-400 font-medium leading-none mb-1">{stat.label}</p>
                                                            <p className="text-base font-bold text-slate-900 leading-none">{stat.value}</p>
                                                        </div>
                                                    </div>
                                                    {i < stats.length - 1 && <div className="border-t border-slate-100" />}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* ═══════ ROUTE VISUALIZER ═══════ */}
                    {src && dest && (
                        <div className="mt-7 bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900 font-display">Route Visualizer</h2>
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                                    <span className="w-[10px] h-[10px] rounded-full bg-orange-400" />
                                    Active Path
                                </div>
                            </div>
                            <div className="relative h-[240px] md:h-[360px] bg-[#f0f2f5] overflow-hidden">
                                <div className="absolute inset-0" style={{
                                    backgroundImage: 'linear-gradient(rgba(148,163,184,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,0.06) 1px,transparent 1px)',
                                    backgroundSize: '40px 40px'
                                }} />
                                <div className="absolute inset-0" style={{
                                    backgroundImage: 'linear-gradient(rgba(148,163,184,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,0.03) 1px,transparent 1px)',
                                    backgroundSize: '10px 10px'
                                }} />
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 700 360" preserveAspectRatio="xMidYMid meet">
                                    <path d="M 90 55 C 140 70,180 120,240 150 S 340 190,380 210 Q 430 240,480 270 T 570 310 Q 590 320,610 330"
                                        stroke="#f97316" strokeWidth="2.5" fill="none" strokeDasharray="6 4" opacity="0.6" />
                                    <path d="M 90 55 C 140 70,180 120,240 150 S 340 190,380 210 Q 430 240,480 270 T 570 310 Q 590 320,610 330"
                                        stroke="#f97316" strokeWidth="2.5" fill="none" opacity="0.25" />
                                    {schedule!.schedule.map((stop, i) => {
                                        const n = schedule!.schedule.length - 1;
                                        const t = n === 0 ? 0 : i / n;
                                        const cx = 90 + t * 520;
                                        const cy = 55 + t * 275 + Math.sin(t * Math.PI) * -20;
                                        const isEnd = i === 0 || i === n;
                                        return (
                                            <g key={stop.sequence_number}>
                                                {isEnd && <circle cx={cx} cy={cy} r="7" fill="#f9731620" />}
                                                <circle cx={cx} cy={cy} r={isEnd ? 4.5 : 3} fill={i === 0 ? '#10b981' : i === n ? '#f97316' : '#f9731680'} />
                                            </g>
                                        );
                                    })}
                                </svg>
                                <div className="absolute top-5 left-5 md:left-8">
                                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-3 py-2">
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider leading-none mb-1">Start</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-[7px] h-[7px] rounded-full bg-emerald-500 shrink-0" />
                                            <p className="text-[13px] font-bold text-slate-900 leading-none">{titleCase(src.station_name)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-5 right-5 md:right-8">
                                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-3 py-2">
                                        <p className="text-[9px] font-bold text-orange-600 uppercase tracking-wider leading-none mb-1">End</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-[7px] h-[7px] rounded-full bg-orange-500 shrink-0" />
                                            <p className="text-[13px] font-bold text-slate-900 leading-none">{titleCase(dest.station_name)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-5 right-5 md:right-8 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 px-3 py-1.5 shadow-sm">
                                    <p className="text-[12px] font-bold text-slate-600">{Math.round(dest.distance_km)}km Total</p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};