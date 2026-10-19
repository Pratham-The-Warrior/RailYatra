import React from 'react';
import { motion } from 'framer-motion';
import { Route } from '../types';
import { Zap, Repeat, Clock } from 'lucide-react';

interface BestTradeoffsProps {
    options: Route[];
}

const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

/** Absolute arrival in minutes from 00:00 of the travel date (first leg departs that day). */
const arrivalAbs = (r: Route) => toMin(r.legs[0].departure_time) + r.total_time_min;

const changesLabel = (n: number) => (n === 0 ? 'Direct' : n === 1 ? '1 change' : `${n} changes`);

/**
 * "Best trade-offs": for each number of changes, the earliest possible arrival,
 * shown only when it beats every option with fewer changes (Pareto frontier).
 */
export const BestTradeoffs: React.FC<BestTradeoffsProps> = ({ options }) => {
    if (options.length === 0) return null;
    const earliest = Math.min(...options.map(arrivalAbs));

    return (
        <section aria-label="Best trade-offs" className="stack-y-3">
            <div>
                <p className="text-orange-500 text-xs md:text-sm font-semibold tracking-widest uppercase">Best trade-offs</p>
                <p className="text-sm text-slate-500">
                    The earliest you can arrive for each number of changes. More changes are only listed when they get you there sooner.
                </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {options.map((r, i) => {
                    const arr = arrivalAbs(r);
                    const dayOffset = Math.floor(arr / 1440);
                    const isEarliest = arr === earliest;
                    const isFewest = i === 0;
                    return (
                        <motion.div
                            key={r.legs.map(l => l.train_number + l.from_code).join('|')}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold text-slate-900">{changesLabel(r.switches)}</span>
                                <div className="flex gap-1.5">
                                    {isFewest && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                            <Repeat className="h-3 w-3" aria-hidden /> Fewest changes
                                        </span>
                                    )}
                                    {isEarliest && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                                            <Zap className="h-3 w-3" aria-hidden /> Earliest arrival
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900">{r.legs[r.legs.length - 1].arrival_time}</span>
                                {dayOffset > 0 && (
                                    <span className="text-xs font-semibold text-slate-500">+{dayOffset} {dayOffset === 1 ? 'day' : 'days'}</span>
                                )}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                <Clock className="h-3.5 w-3.5" aria-hidden />
                                Departs {r.legs[0].departure_time} · {r.total_time_formatted} · {r.total_distance_km} km
                            </div>
                            <ol className="mt-3 stack-y-1 text-xs text-slate-600">
                                {r.legs.map((l, li) => (
                                    <li key={li} className="truncate">
                                        <span className="font-semibold text-slate-800">{l.train_number}</span>{' '}
                                        {l.from_code} {l.departure_time} → {l.to_code} {l.arrival_time}
                                    </li>
                                ))}
                            </ol>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
};
