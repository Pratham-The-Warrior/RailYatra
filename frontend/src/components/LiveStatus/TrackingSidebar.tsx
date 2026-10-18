import React from 'react';

interface TrackingSidebarProps {
    totalStations: number;
    coveredStations: number;
    remainingTime: string;
    avgSpeed: number;
    isEstimate?: boolean;
}

export const TrackingSidebar: React.FC<TrackingSidebarProps> = ({
    totalStations, coveredStations, remainingTime, avgSpeed, isEstimate = false
}) => {
    return (
        <div className="stack-y-5 sm:stack-y-8 lg:stack-y-10">
            <div className="bg-[#1a2533] rounded-2xl md:rounded-[40px] p-5 sm:p-7 md:p-10 text-white shadow-2xl shadow-[#1a2533]/40 relative overflow-hidden">
                <h3 className="font-outfit text-[18px] sm:text-[22px] font-bold text-white tracking-tight mb-5 sm:mb-8">Journey Insights</h3>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-10">
                    <div className="bg-white/2 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 flex flex-col justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 sm:mb-3">{isEstimate ? 'SCHEDULED AVG SPEED' : 'AVG SPEED'}</p>
                        <div className="flex items-baseline gap-1 sm:gap-1.5 mt-auto">
                            <span className="font-outfit text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-tight">{avgSpeed !== undefined && avgSpeed !== null ? avgSpeed : '--'}</span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">KM/H</span>
                        </div>
                    </div>

                    <div className="bg-white/2 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 sm:mb-3">{isEstimate ? 'STATIONS (SCHEDULED)' : 'STATIONS COVERED'}</p>
                            <div className="flex items-baseline gap-1 mt-auto">
                                <span className="font-outfit text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-tight">{coveredStations}</span>
                                <span className="text-xs sm:text-sm font-medium text-slate-500">/ {totalStations}</span>
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/2">
                            <div
                                className="h-full bg-slate-500 transition-all duration-1000 ease-out"
                                style={{ width: `${totalStations > 0 ? (coveredStations / totalStations) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="col-span-2 bg-linear-to-br from-white/4 to-transparent border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-5 opacity-20">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">{isEstimate ? 'SCHEDULED TIME LEFT' : 'REMAINING ETA'}</p>
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

        </div>
    );
};
