import React, { useState, useEffect } from 'react';
import { ArrowRight, Activity, Clock, Train } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingDashboardProps {
    onTrack: (num: string) => void;
}

export const LandingDashboard: React.FC<LandingDashboardProps> = ({
    onTrack
}) => {
    const [recentSearches, setRecentSearches] = useState<{ trainNumber: string, timestamp: number }[]>([]);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('recent_live_status') || '[]');
            setRecentSearches(stored.slice(0, 3));
        } catch (e) {
            console.error('Failed to parse recent searches', e);
        }
    }, []);

    /* ── Recent Searches Card (rendered in two positions with visibility toggle) ── */
    const recentSearchesCard = (
        <div className="bg-[#1e293b] rounded-2xl sm:rounded-[32px] p-5 sm:p-7 shadow-xl shadow-slate-900/10 border border-[#334155]">
            <div className="flex items-center justify-between mb-5 sm:mb-8">
                <h3 className="text-[16px] sm:text-[18px] font-bold text-white tracking-tight flex items-center gap-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                    Recent Searches
                </h3>
            </div>

            {recentSearches.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 sm:p-6 text-center mb-5 sm:mb-8">
                    <Train className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500 mx-auto mb-2 sm:mb-3" />
                    <p className="text-[13px] sm:text-sm text-slate-400 font-medium leading-relaxed">
                        No recent searches found.<br />Search for a train to track!
                    </p>
                </div>
            ) : (
                <div className="space-y-2 sm:space-y-3 mb-5 sm:mb-8">
                    {recentSearches.map((r, i) => (
                        <button key={`${r.trainNumber}-${i}`} onClick={() => onTrack(r.trainNumber)} className="w-full flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl sm:rounded-2xl p-3 px-3 sm:px-4 transition-colors group">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[11px] font-extrabold px-2.5 sm:px-3 py-1.5 rounded-lg text-center tracking-wide">
                                    {r.trainNumber}
                                </div>
                                <div className="text-left">
                                    <p className="text-[12px] sm:text-[13px] font-bold text-white mb-0.5">Track Train</p>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                                        {new Date(r.timestamp).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 lg:gap-8 max-w-[1120px] mx-auto text-left">
            {/* ── LEFT COLUMN ── */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                className="flex flex-col gap-5 sm:gap-6"
            >
                {/* Quick Track Header */}
                <div className="flex items-end justify-between px-1">
                    <div className="flex items-baseline gap-2 sm:gap-3">
                        <h2 className="text-[18px] sm:text-[22px] font-extrabold text-slate-900 tracking-tight font-display">Quick Track</h2>
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-500 tracking-wide">Premium Express</span>
                    </div>
                    <button className="text-[12px] sm:text-[13px] font-bold text-orange-500 hover:text-orange-600 transition-colors">
                        View All
                    </button>
                </div>

                {/* Quick Track Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                    {/* Card 1 */}
                    <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(249,115,22,0.08)] hover:border-orange-200 transition-all cursor-pointer group" onClick={() => onTrack('22436')}>
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <div className="bg-[#1e293b] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg tracking-widest shadow-sm">
                                22436
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
                                <Activity className="w-3.5 h-3.5" /> LIVE
                            </div>
                        </div>
                        <h3 className="text-[15px] sm:text-[17px] font-bold text-slate-900 leading-snug mb-1">
                            NDLS - BSB Vande Bharat
                        </h3>
                        <p className="text-[11px] sm:text-xs font-medium text-slate-500 mb-4 sm:mb-6">
                            Arriving at <strong className="text-slate-700">Kanpur Central</strong>
                        </p>

                        <div className="border-t border-dashed border-slate-200 pt-4 sm:pt-5 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">STATUS</p>
                                <p className="text-[13px] font-bold text-emerald-500">On Time</p>
                            </div>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(249,115,22,0.08)] hover:border-orange-200 transition-all cursor-pointer group" onClick={() => onTrack('12951')}>
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <div className="bg-[#1e293b] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg tracking-widest shadow-sm">
                                12951
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
                                <Activity className="w-3.5 h-3.5" /> LIVE
                            </div>
                        </div>
                        <h3 className="text-[15px] sm:text-[17px] font-bold text-slate-900 leading-snug mb-1">
                            Mumbai Rajdhani Exp
                        </h3>
                        <p className="text-[11px] sm:text-xs font-medium text-slate-500 mb-4 sm:mb-6">
                            Departed <strong className="text-slate-700">Kota Jn</strong>
                        </p>

                        <div className="border-t border-dashed border-slate-200 pt-4 sm:pt-5 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">STATUS</p>
                                <p className="text-[13px] font-bold text-emerald-500">On Time</p>
                            </div>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile only: Recent Searches appears BEFORE Journey Insights */}
                <div className="lg:hidden">
                    {recentSearchesCard}
                </div>

                {/* Journey Insights Complete Block */}
                <div className="bg-[#f8fafc] rounded-2xl sm:rounded-[32px] p-5 sm:p-8 relative overflow-hidden mt-2 sm:mt-4 shadow-sm border border-slate-100">
                    <div className="absolute -right-16 -bottom-16 pointer-events-none opacity-[0.03] text-9xl leading-none">
                        <Activity className="w-72 h-72" />
                    </div>
                    <h3 className="text-[16px] sm:text-[18px] font-bold text-slate-900 tracking-tight font-display mb-5 sm:mb-8">Journey Insights</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-8 relative z-10">
                        {/* Insight 1 */}
                        <div className="flex sm:flex-col items-start gap-3 sm:gap-0">
                            <div className="w-6 h-6 sm:mb-3 text-orange-500 shrink-0">
                                <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-[13px] font-bold text-slate-900 mb-1 sm:mb-2">Peak Demand</h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-medium">
                                    High traffic observed on Delhi-Mumbai route for next 48 hours.
                                </p>
                            </div>
                        </div>

                        {/* Insight 2 */}
                        <div className="flex sm:flex-col items-start gap-3 sm:gap-0">
                            <div className="w-6 h-6 sm:mb-3 text-emerald-500 shrink-0">
                                <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-[13px] font-bold text-slate-900 mb-1 sm:mb-2">Reliability Score</h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-medium">
                                    Shatabdi Express trains maintain a 99% punctuality rate this week.
                                </p>
                            </div>
                        </div>

                        {/* Insight 3 */}
                        <div className="flex sm:flex-col items-start gap-3 sm:gap-0">
                            <div className="w-6 h-6 sm:mb-3 text-orange-400 shrink-0">
                                <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-[13px] font-bold text-slate-900 mb-1 sm:mb-2">Weather Alert</h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-medium">
                                    Mild fog reported near North stations. No major delays expected.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── RIGHT COLUMN (SIDEBAR) — desktop only ── */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
                className="hidden lg:flex flex-col gap-6"
            >
                {recentSearchesCard}
            </motion.div>
        </div>
    );
};
