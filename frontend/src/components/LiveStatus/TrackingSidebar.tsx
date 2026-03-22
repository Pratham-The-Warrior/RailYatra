import React from 'react';
import { Wifi, UtensilsCrossed, BatteryCharging, ShieldCheck } from 'lucide-react';

interface TrackingSidebarProps {
    totalStations: number;
    coveredStations: number;
    remainingTime: string;
    avgSpeed: number;
}

export const TrackingSidebar: React.FC<TrackingSidebarProps> = ({
    totalStations, coveredStations, remainingTime, avgSpeed
}) => {
    return (
        <div className="space-y-5 sm:space-y-8 lg:space-y-10">
            <div className="bg-[#1a2533] rounded-2xl md:rounded-[40px] p-5 sm:p-7 md:p-10 text-white shadow-2xl shadow-[#1a2533]/40 relative overflow-hidden">
                <h3 className="font-outfit text-[18px] sm:text-[22px] font-bold text-white tracking-tight mb-5 sm:mb-8">Journey Insights</h3>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-10">
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 flex flex-col justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 sm:mb-3">AVG SPEED</p>
                        <div className="flex items-baseline gap-1 sm:gap-1.5 mt-auto">
                            <span className="font-outfit text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-tight">{avgSpeed !== undefined && avgSpeed !== null ? avgSpeed : '--'}</span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">KM/H</span>
                        </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 sm:mb-3">STATIONS COVERED</p>
                            <div className="flex items-baseline gap-1 mt-auto">
                                <span className="font-outfit text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-tight">{coveredStations}</span>
                                <span className="text-xs sm:text-sm font-medium text-slate-500">/ {totalStations}</span>
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.02]">
                            <div
                                className="h-full bg-slate-500 transition-all duration-1000 ease-out"
                                style={{ width: `${totalStations > 0 ? (coveredStations / totalStations) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="col-span-2 bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.05] rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-5 opacity-20">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">REMAINING ETA</p>
                        <div className="flex items-baseline gap-3 mt-2">
                            {remainingTime && remainingTime.includes(':') && remainingTime !== '--:--' ? (
                                <>
                                    <span className="font-outfit text-5xl sm:text-6xl font-light text-white tracking-tight">{parseInt(remainingTime.split(':')[0])}</span>
                                    <span className="text-xs sm:text-sm font-medium text-slate-500 -ml-1">hrs</span>
                                    <span className="font-outfit text-5xl sm:text-6xl font-light text-white tracking-tight ml-2 sm:ml-4">{parseInt(remainingTime.split(':')[1])}</span>
                                    <span className="text-xs sm:text-sm font-medium text-slate-500 -ml-1">mins</span>
                                </>
                            ) : (
                                <>
                                    <span className="font-outfit text-4xl sm:text-5xl md:text-6xl font-light text-white tracking-tight">--</span>
                                    <span className="text-xs sm:text-sm font-medium text-slate-500 -ml-1">mins</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 md:p-8">
                <h3 className="font-outfit text-[17px] sm:text-[20px] font-bold text-slate-800 tracking-tight mb-4 sm:mb-6 px-1 sm:px-2">Onboard Amenities</h3>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {[
                        { icon: Wifi, label: 'WiFi', value: 'Active', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
                        { icon: UtensilsCrossed, label: 'Pantry', value: 'Serving', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
                        { icon: BatteryCharging, label: 'Power', value: 'Stable', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                        { icon: ShieldCheck, label: 'Hygiene', value: 'Cleaned', color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
                    ].map(({ icon: Icon, label, value, color, bg, border }) => (
                        <div key={label} className={`group ${bg} ${border} border rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:shadow-md transition-all cursor-default`}>
                            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white flex items-center justify-center mb-2.5 sm:mb-3 shadow-sm border ${border}`}>
                                <Icon className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${color}`} />
                            </div>
                            <p className="text-[12px] sm:text-[13px] font-bold text-slate-800 mb-0.5">{label}</p>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600">{value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
