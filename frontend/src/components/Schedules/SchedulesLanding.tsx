import React from 'react';
import { motion } from 'framer-motion';
import {
    Search, ArrowLeft, Clock, Sparkles, ArrowRight,
    Lightbulb, Train
} from 'lucide-react';

// Assuming titleCase and RecentSearch type are imported from Schedules.tsx or types.ts
import { titleCase, RecentSearch } from '../../pages/Schedules';

interface SchedulesLandingProps {
    trainNumber: string;
    setTrainNumber: (val: string) => void;
    fetchSchedule: (num: string) => void;
    handleSubmit: (e: React.FormEvent) => void;
    recents: RecentSearch[];
    onNavigate?: (page: 'home' | 'schedules' | 'category-routes') => void;
}

const popularTrains = [
    { number: '22436', name: 'Vande Bharat Express', tag: 'PREMIUM', tagColor: 'text-orange-600 bg-orange-50', icon: '🚄' },
    { number: '12301', name: 'Rajdhani Express', tag: 'EXPRESS', tagColor: 'text-emerald-600 bg-emerald-50', icon: '🚆' },
    { number: '12001', name: 'Shatabdi Express', tag: 'SUPERFAST', tagColor: 'text-emerald-600 bg-emerald-50', icon: '🚃' },
    { number: '12213', name: 'Duronto Express', tag: 'INTERCITY', tagColor: 'text-blue-600 bg-blue-50', icon: '🚋' },
];

export const SchedulesLanding: React.FC<SchedulesLandingProps> = ({
    trainNumber, setTrainNumber, fetchSchedule, handleSubmit, recents, onNavigate
}) => {
    return (
        <div className="min-h-screen pb-12 md:pb-20 bg-[#f5f6f8] relative">
            {onNavigate && (
                <div className="absolute top-20 md:top-24 left-0 w-full z-20 pointer-events-none">
                    <div className="max-w-[1120px] mx-auto px-4 md:px-5 flex justify-start">
                        <button
                            onClick={() => onNavigate('home')}
                            className="pointer-events-auto inline-flex items-center justify-center gap-2 text-slate-500 hover:text-orange-500 text-sm font-semibold transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Home
                        </button>
                    </div>
                </div>
            )}
            
            {/* ═══ HERO ═══ */}
            <div className="relative overflow-hidden pt-24 md:pt-32">
                {/* Subtle gradient bg */}
                <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-transparent" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-orange-50/80 to-transparent rounded-full blur-3xl opacity-60" />

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
};
