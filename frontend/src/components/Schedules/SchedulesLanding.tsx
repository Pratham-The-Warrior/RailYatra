import React from 'react';
import { motion } from 'framer-motion';
import {
    Search, Clock, Sparkles, ArrowRight,
    Lightbulb, Train, ChevronRight
} from 'lucide-react';

// Assuming titleCase and RecentSearch type are imported from Schedules.tsx or types.ts
import { titleCase, RecentSearch } from '../../pages/Schedules';
import { BackButton } from '../Common/BackButton';

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
        <div className="min-h-screen pb-20 md:pb-20 bg-[#f5f6f8] relative">

            {/* ═══ HERO ═══ */}
            <div className="relative overflow-hidden pt-16 md:pt-24">
                {/* Subtle gradient bg */}
                <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-transparent" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-orange-50/80 to-transparent rounded-full blur-3xl opacity-60" />

                {/* Back Button — aligned with navbar logo */}
                {onNavigate && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="relative max-w-[1120px] mx-auto px-4 md:px-5 mb-4 md:mb-8"
                    >
                        <BackButton onClick={() => onNavigate('home')} label="Back to Home" />
                    </motion.div>
                )}

                <div className="relative max-w-[1120px] mx-auto px-4 md:px-5 pb-6 md:pb-14 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-[22px] sm:text-3xl md:text-[48px] font-extrabold text-slate-900 font-display leading-[1.2] mb-2 md:mb-5 tracking-tight text-center"
                    >
                        Track Your Journey with{' '}
                        <span className="text-orange-500">RailYatra</span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-slate-500 text-[13px] md:text-lg max-w-lg mx-auto leading-relaxed mb-5 md:mb-10 px-1 md:px-0 text-center"
                    >
                        Access real-time schedules, platform info, and coach positions for all Indian passenger trains.
                    </motion.p>

                    {/* Search Bar */}
                    <motion.form
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        onSubmit={handleSubmit}
                        className="max-w-2xl mx-auto mb-4"
                    >
                        <div className="relative">
                            <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] md:w-5 md:h-5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={trainNumber}
                                onChange={e => setTrainNumber(e.target.value)}
                                placeholder="Enter Train Number (e.g. 12002)"
                                className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 md:py-5 pl-11 md:pl-14 pr-[108px] md:pr-36 text-sm md:text-base font-medium text-slate-900 shadow-lg shadow-slate-200/40 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-slate-400"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 md:gap-2 px-5 md:px-8 py-2.5 md:py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm md:text-[15px] font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-[0.97]"
                            >
                                Search
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.form>

                    {/* Quick-access chips */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        className="flex flex-wrap items-center justify-center gap-2 md:gap-3 px-1"
                    >
                        {recents.length > 0 && (
                            <button
                                onClick={() => { setTrainNumber(recents[0].trainNumber); fetchSchedule(recents[0].trainNumber); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-500 hover:border-orange-300 hover:text-orange-500 transition-all shadow-sm"
                            >
                                <Clock className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[140px]">{recents[0].trainNumber} {titleCase(recents[0].trainName)}</span>
                            </button>
                        )}
                        <button
                            onClick={() => { setTrainNumber('22436'); fetchSchedule('22436'); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-xs font-medium text-orange-600 hover:bg-orange-100 transition-all shadow-sm"
                        >
                            <Sparkles className="w-3 h-3 shrink-0" />
                            Vande Bharat
                        </button>
                        <button
                            onClick={() => { setTrainNumber('12301'); fetchSchedule('12301'); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-xs font-medium text-orange-600 hover:bg-orange-100 transition-all shadow-sm"
                        >
                            <Sparkles className="w-3 h-3 shrink-0" />
                            Rajdhani
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* ═══ CONTENT ═══ */}
            <div className="max-w-[1120px] mx-auto px-4 md:px-5 mt-2 md:mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 md:gap-7">

                    {/* LEFT COLUMN */}
                    <div className="space-y-5 md:space-y-8">
                        {/* ── Popular Trains ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                        >
                            <div className="flex items-center justify-between mb-3 md:mb-4">
                                <h2 className="flex items-center gap-2 text-base md:text-lg font-bold text-slate-900 font-display">
                                    <Sparkles className="w-[18px] h-[18px] md:w-5 md:h-5 text-orange-500" />
                                    Popular Trains
                                </h2>
                                <button className="text-xs md:text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                                    View all
                                </button>
                            </div>

                            {/* Horizontal scroll on mobile, 2-col grid on larger */}
                            <div className="md:hidden -mx-4 px-4">
                                <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    {popularTrains.map(t => (
                                        <button
                                            key={t.number}
                                            onClick={() => { setTrainNumber(t.number); fetchSchedule(t.number); }}
                                            className="snap-start shrink-0 w-[160px] flex flex-col items-center gap-2 bg-white border border-slate-200/80 rounded-2xl px-3 py-4 text-center hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100/40 transition-all group active:scale-[0.97]"
                                        >
                                            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl group-hover:bg-orange-50 group-hover:border-orange-200 transition-colors">
                                                {t.icon}
                                            </div>
                                            <div className="min-w-0 w-full">
                                                <span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${t.tagColor} px-2 py-0.5 rounded inline-block`}>
                                                    {t.tag}
                                                </span>
                                                <p className="text-[13px] font-semibold text-slate-800 mt-1 truncate">{t.name}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">#{t.number}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2-col grid on md+ */}
                            <div className="hidden md:grid grid-cols-2 gap-3">
                                {popularTrains.map(t => (
                                    <button
                                        key={t.number}
                                        onClick={() => { setTrainNumber(t.number); fetchSchedule(t.number); }}
                                        className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-xl px-5 py-5 text-left hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100/40 transition-all group active:scale-[0.98]"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl group-hover:bg-orange-50 group-hover:border-orange-200 transition-colors">
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
                            <h2 className="flex items-center gap-2 text-base md:text-lg font-bold text-slate-900 font-display mb-3 md:mb-4">
                                <Clock className="w-[18px] h-[18px] md:w-5 md:h-5 text-slate-400" />
                                Recent Searches
                            </h2>
                            {recents.length === 0 ? (
                                <div className="bg-orange-50/50 border border-orange-100 rounded-2xl px-5 py-8 md:py-10 text-center">
                                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-orange-100/80 flex items-center justify-center mx-auto mb-3">
                                        <Search className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <p className="text-[13px] md:text-sm text-slate-500 italic leading-relaxed">
                                        No recent searches yet.<br className="md:hidden" /> Start by searching for a train number.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 md:space-y-2">
                                    {recents.map(r => (
                                        <button
                                            key={r.trainNumber}
                                            onClick={() => { setTrainNumber(r.trainNumber); fetchSchedule(r.trainNumber); }}
                                            className="w-full flex items-center gap-3 bg-white border border-slate-200/80 rounded-xl px-3.5 md:px-4 py-3 text-left hover:border-orange-300 hover:bg-orange-50/30 transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                                <Train className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] md:text-sm font-semibold text-slate-800 truncate">
                                                    {r.trainNumber} – {titleCase(r.trainName)}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-400 transition-colors shrink-0" />
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
                        className="space-y-4 md:space-y-6"
                    >
                        {/* ── Pro Tips (collapsed on mobile as a compact card) ── */}
                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 md:p-6">
                            <h3 className="flex items-center gap-2 text-sm md:text-base font-bold text-slate-900 font-display mb-3 md:mb-5">
                                <Lightbulb className="w-4 h-4 text-emerald-500" />
                                Pro Tips
                            </h3>
                            <div className="space-y-3 md:space-y-4">
                                {[
                                    {
                                        num: '1',
                                        title: '5-digit magic:',
                                        desc: 'Enter the exact 5-digit train number for instant, accurate results.'
                                    },
                                    {
                                        num: '2',
                                        title: 'Live Status:',
                                        desc: "Click 'Live Status' on any schedule to track your train in real-time."
                                    },
                                    {
                                        num: '3',
                                        title: 'Offline Access:',
                                        desc: 'Save frequent schedules for offline viewing while traveling.'
                                    },
                                ].map(tip => (
                                    <div key={tip.num} className="flex gap-2.5 md:gap-3">
                                        <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-[10px] md:text-[11px] font-bold text-orange-600 shrink-0 mt-0.5">
                                            {tip.num}
                                        </span>
                                        <p className="text-xs md:text-[13px] text-slate-600 leading-relaxed">
                                            <strong className="text-slate-900">{tip.title}</strong>{' '}{tip.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Planning a Trip ── */}
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 md:p-6 text-white shadow-lg shadow-orange-500/20">
                            <h3 className="text-base md:text-lg font-bold mb-1.5 md:mb-2">Planning a Trip?</h3>
                            <p className="text-orange-100 text-xs md:text-sm leading-relaxed mb-4 md:mb-5">
                                Check PNR status and booking availability in one click.
                            </p>
                            <button className="w-full bg-white text-orange-600 font-bold text-sm md:text-[15px] py-3 md:py-3.5 rounded-xl hover:bg-orange-50 transition-colors active:scale-[0.97] shadow-sm">
                                Check PNR Now
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
