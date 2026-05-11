import React from 'react';
import { motion } from 'framer-motion';
import { Route } from '../types';
import { Clock, MapPin, Train, GitCommit, ArrowRight, Layers } from 'lucide-react';

interface RouteCardCompactProps {
    route: Route;
    index: number;
}

export const RouteCardCompact: React.FC<RouteCardCompactProps> = ({ route, index }) => {
    const parseTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, type: 'spring', stiffness: 260, damping: 24 }}
            className="route-card-compact group"
        >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />

            {/* ── Header: Duration · Distance · Badge ── */}
            <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                            {route.total_time_formatted}
                        </div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                            <Clock size={8} /> Duration
                        </div>
                    </div>
                    <div className="w-px h-7 bg-slate-200" />
                    <div>
                        <div className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                            {route.total_distance_km}<span className="text-xs ml-0.5 text-slate-400 font-medium">km</span>
                        </div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                            <MapPin size={8} /> Distance
                        </div>
                    </div>
                </div>

                <div className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm shrink-0 ${route.switches === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'}`}>
                    {route.switches === 0 ? <GitCommit size={11} /> : <Layers size={11} />}
                    {route.switches === 0 ? 'Direct' : `${route.switches} Chg`}
                </div>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-slate-100" />

            {/* ── Legs ── */}
            <div className="px-5 pt-4 pb-5 space-y-3 flex-1">
                {route.legs.map((leg, i) => (
                    <div key={i} className="space-y-2.5">
                        {/* Train name + number + type */}
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                                <Train size={12} className="text-blue-600" />
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="text-[13px] font-bold text-slate-900 truncate leading-tight">{leg.train_name}</span>
                                <span className="text-[7px] bg-blue-100 text-blue-700 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 leading-none">
                                    {leg.train_number}
                                </span>
                            </div>
                        </div>

                        {/* Departure → Arrival */}
                        <div className="flex items-center gap-2 bg-slate-50/80 rounded-lg p-2.5 border border-slate-100">
                            <div className="min-w-0">
                                <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">Dep</div>
                                <div className="text-[15px] font-bold text-slate-900 leading-tight mt-0.5">{leg.departure_time}</div>
                                <div className="text-[9px] font-medium text-slate-500 truncate leading-none mt-0.5">{leg.from_code}</div>
                            </div>

                            <div className="flex-1 flex items-center justify-center px-1">
                                <div className="w-full h-[1.5px] bg-gradient-to-r from-blue-300 via-blue-400 to-indigo-400 relative rounded-full">
                                    <ArrowRight size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-indigo-500 bg-slate-50 rounded-full" />
                                </div>
                            </div>

                            <div className="min-w-0 text-right">
                                <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">Arr</div>
                                <div className="text-[15px] font-bold text-slate-900 leading-tight mt-0.5">{leg.arrival_time}</div>
                                <div className="text-[9px] font-medium text-slate-500 truncate leading-none mt-0.5">{leg.to_code}</div>
                            </div>
                        </div>

                        {/* Per-leg classes */}
                        <div className="flex gap-1 flex-wrap">
                            {leg.classes.map(c => (
                                <span key={c} className="text-[7px] font-bold bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase leading-none">
                                    {c}
                                </span>
                            ))}
                        </div>

                        {/* Transfer info between legs */}
                        {i < route.legs.length - 1 && (() => {
                            const arrMin = parseTime(leg.arrival_time);
                            let depMin = parseTime(route.legs[i + 1].departure_time);
                            if (depMin < arrMin) depMin += 24 * 60;
                            const waitTimeNum = depMin - arrMin;
                            const waitH = Math.floor(waitTimeNum / 60);
                            const waitM = waitTimeNum % 60;
                            const waitFormatted = waitH > 0 ? `${waitH}h ${waitM}m` : `${waitM}m`;

                            return (
                                <div className="flex items-center gap-3 bg-orange-50 rounded-xl px-3.5 py-3 border border-orange-200 my-1">
                                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                                        <MapPin size={16} className="text-orange-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[9px] font-bold text-orange-500 uppercase tracking-widest leading-none">Change at</div>
                                        <div className="text-sm font-bold text-slate-900 uppercase tracking-tight leading-tight mt-0.5">{leg.to_name || leg.to_code}</div>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-orange-200 shadow-sm shrink-0">
                                        <Clock size={12} className="text-orange-600" />
                                        <span className="text-xs font-extrabold text-slate-900 leading-none">{waitFormatted}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
