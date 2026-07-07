import React from 'react';
import { Route } from '../types';
import { GitCommit, Layers, Train, ArrowRight, MapPin } from 'lucide-react';

interface RouteCardMobileProps {
    route: Route;
    index: number;
}

export const RouteCardMobile: React.FC<RouteCardMobileProps> = ({ route }) => {
    const parseTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden active:scale-[0.97] transition-transform duration-150 shadow-sm">
            {/* ── Top accent ── */}
            <div className="h-[2.5px] bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />

            {/* ── Header: duration · distance · switches ── */}
            <div className="flex items-center justify-between px-2.5 py-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12px] font-extrabold text-slate-900 leading-none tracking-tight">
                        {route.total_time_formatted}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 leading-none">
                        {route.total_distance_km}km
                    </span>
                </div>
                <div className={`px-1.5 py-[2px] rounded text-[7px] font-bold uppercase tracking-wider flex items-center gap-0.5 leading-none shrink-0 shadow-sm ${route.switches === 0
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-white'
                    }`}>
                    {route.switches === 0 ? <GitCommit size={8} /> : <Layers size={8} />}
                    {route.switches === 0 ? 'Direct' : `${route.switches} Chg`}
                </div>
            </div>

            {/* ── Legs ── */}
            <div className="px-2.5 py-2 space-y-1.5">
                {route.legs.map((leg, i) => (
                    <React.Fragment key={i}>
                        {/* Train name + number */}
                        <div className="flex items-center gap-1 min-w-0">
                            <Train size={9} className="text-blue-500 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-700 truncate leading-none">
                                {leg.train_name}
                            </span>
                            <span className="text-[7px] text-slate-400 font-bold shrink-0 leading-none">
                                {leg.train_number}
                            </span>
                        </div>

                        {/* Departure → Arrival */}
                        <div className="flex items-center gap-1">
                            <div>
                                <div className="text-[12px] font-extrabold text-slate-900 leading-none">
                                    {leg.departure_time}
                                </div>
                                <div className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-0.5">
                                    {leg.from_code}
                                </div>
                            </div>

                            <div className="flex-1 flex items-center px-0.5">
                                <div className="w-full h-[1px] bg-slate-200 relative">
                                    <ArrowRight size={7} className="absolute -right-0.5 top-1/2 -translate-y-1/2 text-slate-300" />
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-[12px] font-extrabold text-slate-900 leading-none">
                                    {leg.arrival_time}
                                </div>
                                <div className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-0.5">
                                    {leg.to_code}
                                </div>
                            </div>
                        </div>

                        {/* ── Change indicator ── */}
                        {i < route.legs.length - 1 && (() => {
                            const arrMin = parseTime(leg.arrival_time);
                            let depMin = parseTime(route.legs[i + 1].departure_time);
                            if (depMin < arrMin) depMin += 24 * 60;
                            const waitTimeNum = depMin - arrMin;
                            const waitH = Math.floor(waitTimeNum / 60);
                            const waitM = waitTimeNum % 60;
                            const waitFormatted = waitH > 0 ? `${waitH}h ${waitM}m` : `${waitM}m`;

                            return (
                                <div className="flex items-center justify-center gap-1 py-0.5">
                                    <div className="flex-1 border-t border-dashed border-blue-200" />
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded-full border border-blue-100">
                                        <MapPin size={7} className="text-blue-500 shrink-0" />
                                        <span className="text-[8px] font-bold text-blue-600 leading-none">
                                            {leg.to_code} · {waitFormatted}
                                        </span>
                                    </div>
                                    <div className="flex-1 border-t border-dashed border-blue-200" />
                                </div>
                            );
                        })()}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};
