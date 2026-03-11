import React from 'react';
import { motion } from 'framer-motion';
import { Route } from '../types';
import { Clock, MapPin, Train, GitCommit, ArrowRight, Layers } from 'lucide-react';

interface RouteCardProps {
    route: Route;
    index: number;
}

export const RouteCard: React.FC<RouteCardProps> = ({ route, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="w-full bg-white border border-slate-200 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group"
        >
            {/* Route Header summary */}
            <div className="p-5 md:p-8 bg-blue-50/30 flex flex-col sm:flex-row gap-6 md:gap-10 items-start sm:items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-5 md:gap-10 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <div className="space-y-0.5 shrink-0">
                        <div className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 font-display">{route.total_time_formatted}</div>
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                            <Clock size={10} /> Travel Time
                        </div>
                    </div>
                    <div className="w-px h-8 md:h-12 bg-slate-200 shrink-0" />
                    <div className="space-y-0.5 shrink-0">
                        <div className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 font-display">{route.total_distance_km}<span className="text-base md:text-xl ml-1 text-slate-400 font-bold">km</span></div>
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                            <MapPin size={10} /> Total Distance
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm ${route.switches === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'}`}>
                        {route.switches === 0 ? <GitCommit size={14} /> : <Layers size={14} />}
                        {route.switches === 0 ? 'Direct' : `${route.switches} Changes`}
                    </div>
                </div>
            </div>

            {/* Legs Details */}
            <div className="p-5 md:p-8 space-y-8 md:space-y-12 relative bg-white">
                {/* Connection Line with subtle dash */}
                <div className="absolute left-[39px] md:left-[47px] top-12 bottom-12 w-0.5 border-l-2 border-dashed border-blue-100" />

                {route.legs.map((leg, i) => (
                    <div key={i} className="relative pl-10 md:pl-14 group/leg">
                        {/* Timeline Node */}
                        <div className="absolute left-0 top-0 w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white border-2 border-blue-600 flex items-center justify-center text-blue-100 z-10 shadow-md md:shadow-lg shadow-blue-100 group-hover/leg:bg-blue-600 transition-colors">
                            <Train size={18} className="text-blue-600 group-hover/leg:text-white transition-colors" />
                        </div>

                        <div className="space-y-4 md:space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                        <h4 className="text-lg md:text-2xl font-bold text-slate-900 font-display leading-none">{leg.train_name}</h4>
                                        <span className="text-[10px] bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{leg.train_number}</span>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md border border-slate-200">{leg.train_type}</span>
                                    </div>
                                </div>

                                <div className="flex gap-1.5 flex-wrap">
                                    {leg.classes.map(c => (
                                        <span key={c} className="text-[9px] md:text-[10px] font-black bg-white border border-slate-200 text-slate-600 px-2 py-1 md:py-1.5 rounded-md md:rounded-lg uppercase shadow-sm">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-slate-50/50 p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-100">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                            <MapPin size={16} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Departure</div>
                                            <div className="text-xl md:text-2xl font-black font-display text-slate-900">{leg.departure_time}</div>
                                            <div className="text-xs md:text-sm font-bold text-slate-500 truncate max-w-[150px] md:max-w-none">{leg.from_name} <span className="text-[10px] text-slate-300 ml-1">({leg.from_code})</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 text-left md:text-left">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                                            <ArrowRight size={16} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Arrival</div>
                                            <div className="text-xl md:text-2xl font-black font-display text-slate-900">{leg.arrival_time}</div>
                                            <div className="text-xs md:text-sm font-bold text-slate-500 truncate max-w-[150px] md:max-w-none">{leg.to_name} <span className="text-[10px] text-slate-300 ml-1">({leg.to_code})</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Waiting info if not last leg */}
                            {i < route.legs.length - 1 && (() => {
                                // max_wait is capped at 600 min (10hrs) < 1440 min (24hrs),
                                // so adding 1440 once is always correct for any valid transfer.
                                const parseTime = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                                const arrMin = parseTime(leg.arrival_time);
                                let depMin = parseTime(route.legs[i + 1].departure_time);
                                if (depMin < arrMin) depMin += 24 * 60;
                                const waitTimeNum = depMin - arrMin;
                                const waitH = Math.floor(waitTimeNum / 60);
                                const waitM = waitTimeNum % 60;
                                const waitFormatted = waitH > 0
                                    ? `${waitH}h ${waitM}m`
                                    : `${waitM}m`;

                                return (
                                    <div className="relative py-4 md:py-6 my-1 group/transfer flex justify-center px-4 md:px-10">
                                        <div className="w-full max-w-xl">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40 p-3.5 md:p-5 rounded-xl md:rounded-3xl border border-slate-100 transition-all duration-300 group-hover/transfer:bg-blue-50/40 group-hover/transfer:border-blue-100">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-blue-600">
                                                        <MapPin size={10} className="md:w-3 md:h-3" />
                                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] font-display">Transfer At</span>
                                                    </div>
                                                    <h3 className="text-lg md:text-xl font-extrabold text-slate-900 font-display uppercase tracking-tight leading-none text-balance">
                                                        {leg.to_name}
                                                    </h3>
                                                </div>

                                                <div className="flex items-center gap-3 md:gap-4 bg-white px-3.5 py-2 md:py-2.5 rounded-xl border border-slate-200 shadow-sm transition-transform group-hover/transfer:scale-[1.02] shrink-0">
                                                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                        <Clock size={16} className="md:w-5 md:h-5" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block">Wait Duration</span>
                                                        <span className="text-lg md:text-xl font-black font-display text-slate-900 leading-none">{waitFormatted}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
