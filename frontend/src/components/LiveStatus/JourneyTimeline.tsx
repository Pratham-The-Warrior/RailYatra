import React from 'react';
import { Check, Train } from 'lucide-react';
import { LiveStatusResponse, parseTimeAndDate, titleCase } from '../../pages/LiveStatus';

interface JourneyTimelineProps {
    statusData: LiveStatusResponse;
    activeIdx: number;
    isMoving?: boolean;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({
    statusData, activeIdx, isMoving = false
}) => {
    const itinerary = statusData.itinerary;
    return (
        <div className="bg-white rounded-2xl md:rounded-[40px] border border-slate-100 shadow-sm p-4 sm:p-6 md:p-10 pb-12 sm:pb-16 md:pb-20">
            <div className="flex items-center gap-3 sm:gap-5 mb-2 sm:mb-3">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-[20px] bg-orange-50 flex items-center justify-center border border-orange-100/50">
                    <Train className="w-4 h-4 sm:w-6 sm:h-6 text-orange-500" />
                </div>
                <h2 className="font-outfit text-[18px] sm:text-[22px] font-bold text-slate-800 tracking-tight">Journey Timeline</h2>
            </div>

            <div className="relative">
                <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />

                <div className="max-h-[600px] overflow-y-auto scrollbar-timeline pr-1 sm:pr-2 pb-6 pt-0">
                    <div className="space-y-3 sm:space-y-4 relative ml-1 sm:ml-2 md:ml-4">
                        <div className="absolute left-[15px] top-6 bottom-6 w-[2px] bg-[#f1f5f9]" />

                        {itinerary.map((stop, stopIdx) => {
                            // --- State Logic ---
                            // If Moving: 0..activeIdx are PASSED, activeIdx node is followed by MOVING node (CURRENT), activeIdx+1.. are UPCOMING
                            // If Halted: 0..activeIdx-1 are PASSED, activeIdx is CURRENT, activeIdx+1.. are UPCOMING

                            const isPassed = stop.isPassed;
                            const isCurrent = stop.isCurrent;


                            // Helper for clean time/label extraction
                            const formatTime = (timeStr: string) => {
                                if (timeStr === '--' || !timeStr || timeStr === 'SOURCE' || timeStr === 'DEST') return '--';
                                const parsed = parseTimeAndDate(timeStr);
                                return parsed.time;
                            };

                            const formatStatus = (status: string) => {
                                const s = status.toUpperCase();
                                if (s === 'ON TIME') return 'ON TIME';
                                if (s.includes('DELAYED BY')) return s;
                                if (s.includes('DELAYED')) return s;
                                if (s === '') return 'ON TIME';
                                return s;
                            };

                            const schArr = formatTime(stop.timings.sch_arr !== 'SOURCE' ? stop.timings.sch_arr : stop.timings.sch_dep);
                            const actArr = formatTime(stop.timings.act_arr !== 'SOURCE' ? stop.timings.act_arr : stop.timings.act_dep);
                            const actDep = formatTime(stop.timings.act_dep !== 'DEST' ? stop.timings.act_dep : stop.timings.act_arr);

                            const arrivalDate = parseTimeAndDate(stop.timings.sch_arr !== 'SOURCE' ? stop.timings.sch_arr : stop.timings.sch_dep).date;

                            let showDateHeader = false;
                            if (arrivalDate) {
                                if (stopIdx === 0) showDateHeader = true;
                                else {
                                    const prevStop = itinerary[stopIdx - 1];
                                    const prevDate = parseTimeAndDate(prevStop.timings.sch_arr !== 'SOURCE' ? prevStop.timings.sch_arr : prevStop.timings.sch_dep).date;
                                    if (arrivalDate !== prevDate) showDateHeader = true;
                                }
                            }

                            return (
                                <div key={stopIdx} className="flex flex-col w-full relative">
                                    {showDateHeader && arrivalDate && (
                                        <div className="flex items-center gap-4 mb-4 mt-0">
                                            <div className="relative z-10 shrink-0 flex items-center justify-center w-8 h-8">
                                                <div className="w-2 h-2 rounded-full bg-slate-300 ring-[4px] ring-white" />
                                            </div>
                                            <div className="px-3 py-1 bg-slate-100 rounded-md text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                {arrivalDate}
                                            </div>
                                        </div>
                                    )}

                                    <div className="relative flex items-start gap-3 sm:gap-4 md:gap-6 group">
                                        <div className="relative z-10 shrink-0 flex items-center justify-center w-8 h-8 bg-white mt-3">
                                            {isPassed ? (
                                                <div className="w-[18px] h-[18px] rounded-full bg-[#f8fafc] flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-slate-300" strokeWidth={4} />
                                                </div>
                                            ) : isCurrent ? (
                                                <div className="w-[18px] h-[18px] rounded-full bg-[#f97316] flex items-center justify-center ring-[4px] ring-white">
                                                    <div className="w-2 h-2 bg-white rounded-full" />
                                                </div>
                                            ) : (
                                                <div className="w-2 h-2 rounded-full border-[2px] border-slate-200 bg-white ring-4 ring-white" />
                                            )}
                                        </div>

                                        <div className={`flex-1 rounded-2xl md:rounded-3xl px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 transition-all duration-300 ${isCurrent ? 'bg-[#fff7ed] border-2 border-orange-500 shadow-lg shadow-orange-500/10' :
                                            'bg-white border border-slate-100 hover:border-slate-200'
                                            }`}>

                                            {/* ═══ ACTIVE STATION ═══ */}
                                            {isCurrent ? (
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                                                    {/* Station identity */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5 md:mb-2 text-wrap">
                                                            <p className="text-[10px] md:text-[11px] font-black text-orange-600 uppercase tracking-widest">CURRENT STATION</p>
                                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] md:text-[10px] font-black rounded uppercase tracking-wider">{stop.station_code}</span>
                                                        </div>
                                                        <h3 className="text-[20px] md:text-[28px] font-black text-orange-950 truncate leading-tight mb-2">{titleCase(stop.station)}</h3>
                                                        <div className="flex items-center gap-3">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 bg-orange-100 border border-orange-200 text-orange-700 text-[9px] md:text-[10px] font-black rounded-md uppercase tracking-wider">
                                                                {stop.platform && stop.platform !== 'N/A' ? (stop.platform.toUpperCase().includes('PF') ? stop.platform.toUpperCase() : `PF ${stop.platform}`) : 'PF --'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Time columns */}
                                                    <div className="flex items-center gap-4 xl:gap-8 shrink-0 mt-4 md:mt-0">
                                                        {stop.distance_km !== undefined && (
                                                            <div className="flex flex-col items-center min-w-[80px] lg:min-w-[100px]">
                                                                <p className="text-[10px] font-black text-orange-600/60 uppercase tracking-widest mb-1.5">DISTANCE</p>
                                                                <p className="text-[18px] md:text-[22px] font-black text-orange-950 leading-none mb-2">{stop.distance_km} KM</p>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col items-center min-w-[70px] xl:min-w-[90px]">
                                                            <p className="text-[10px] font-black text-orange-600/60 uppercase tracking-widest mb-1.5">ARRIVED</p>
                                                            <p className="text-[20px] md:text-[28px] font-black text-orange-950 leading-none mb-2">{actArr}</p>
                                                            <span className={`${stop.is_delayed ? 'bg-red-500' : 'bg-emerald-500'} text-white text-[8px] md:text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider shadow-sm`}>
                                                                {formatStatus(stop.status)}
                                                            </span>
                                                        </div>

                                                        <div className="w-[1px] h-10 xl:h-14 bg-orange-200 opacity-50" />

                                                        <div className="flex flex-col items-center min-w-[70px] xl:min-w-[90px]">
                                                            <p className="text-[10px] font-black text-orange-600/60 uppercase tracking-widest mb-1.5">EXPECTED DEP</p>
                                                            <p className="text-[20px] md:text-[28px] font-black text-orange-950 leading-none mb-2">{actDep}</p>
                                                            <p className="text-[8px] md:text-[9px] font-black uppercase text-orange-600/70 tracking-widest">
                                                                HALT: {stop.haltMins || 0} MIN
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (

                                                /* ═══ NON-ACTIVE STATION ═══ */
                                                <>
                                                    {/* Desktop non-active */}
                                                    <div className="hidden md:flex items-center justify-between gap-4">
                                                        {/* Left: station name + PF badge */}
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[8px] font-black rounded uppercase tracking-wider border border-slate-100">{stop.station_code}</span>
                                                                <h3 className="text-[16px] font-semibold text-[#475569] truncate group-hover:text-slate-900 transition-colors">{titleCase(stop.station)}</h3>
                                                            </div>
                                                            <div className="flex items-center gap-3 ml-6">
                                                                <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[9px] font-black rounded uppercase tracking-wide">
                                                                    {stop.platform && stop.platform !== 'N/A' ? (stop.platform.toUpperCase().includes('PF') ? stop.platform.toUpperCase() : `PF ${stop.platform}`) : 'PF --'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* Right: times + status */}
                                                        <div className="flex items-center gap-4 xl:gap-8 shrink-0">
                                                            {stop.distance_km !== undefined && (
                                                                <div className="flex flex-col items-center min-w-[80px] lg:min-w-[100px]">
                                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">DISTANCE</p>
                                                                    <p className="text-[15px] font-black text-slate-950 tracking-tight">{stop.distance_km} KM</p>
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col items-center min-w-[70px] xl:min-w-[90px]">
                                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">SCHEDULED</p>
                                                                <p className="text-[15px] font-black text-slate-950 tracking-tight">{schArr}</p>
                                                            </div>
                                                            <div className="flex flex-col items-center min-w-[70px] xl:min-w-[90px]">
                                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                                                    {isPassed ? 'ACTUAL' : 'EXPECTED'}
                                                                </p>
                                                                <p className="text-[15px] font-black text-slate-950 tracking-tight">{actArr}</p>
                                                            </div>
                                                            <div className="min-w-[120px] flex justify-end">
                                                                <span className={`${stop.is_delayed ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-widest text-center min-w-[100px] border`}>
                                                                    {formatStatus(stop.status)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Mobile non-active */}
                                                    <div className="md:hidden">
                                                        {/* Row 1: [code] station name ............ status badge */}
                                                        <div className="flex items-start justify-between gap-3 mb-1.5">
                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                <span className="shrink-0 px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[7px] font-black rounded border border-slate-100 uppercase tracking-wider">{stop.station_code}</span>
                                                                <h3 className="text-[15px] font-bold text-slate-700 truncate leading-snug">{titleCase(stop.station)}</h3>
                                                            </div>
                                                            <div className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${stop.is_delayed ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                                {formatStatus(stop.status)}
                                                            </div>
                                                        </div>
                                                        {/* Details row: PF + KM */}
                                                        <div className="pl-5 mb-2.5 flex items-center gap-4">
                                                            <div className="inline-flex px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 text-[8px] font-extrabold rounded uppercase tracking-wide">
                                                                {stop.platform && stop.platform !== 'N/A'
                                                                    ? (stop.platform.toUpperCase().includes('PF') ? stop.platform.toUpperCase() : `PF ${stop.platform}`)
                                                                    : 'PF --'}
                                                            </div>
                                                            {stop.distance_km !== undefined && (
                                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] flex items-center gap-1.5">
                                                                    <div className="w-1 h-1 rounded-full bg-slate-400" />
                                                                    {stop.distance_km} KM
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Times row */}
                                                        <div className="pl-5 flex items-center gap-4 text-[11px] text-slate-500">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[8px] font-black text-slate-500 uppercase">SCH</span>
                                                                <span className="font-black text-slate-950">{schArr}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[8px] font-black text-slate-500 uppercase">ACT</span>
                                                                <span className="font-black text-slate-950">{actArr}</span>
                                                                {stop.is_delayed && stop.delay_mins !== undefined && (
                                                                    <span className="text-[9px] font-bold text-slate-500 ml-0.5">({stop.delay_mins} MIN)</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* ═══ DYNAMIC IN-TRANSIT NODE ═══ */}
                                    {isMoving && stopIdx === activeIdx && itinerary[stopIdx + 1] && (
                                        <div className="relative flex items-start gap-3 sm:gap-4 md:gap-6 group py-4 md:py-6">
                                            <div className="relative z-10 shrink-0 flex items-center justify-center w-8 h-8 bg-white">
                                                <div className="w-[20px] h-[20px] rounded-full bg-blue-600 flex items-center justify-center ring-[4px] ring-blue-50">
                                                    <Train className="w-3 h-3 text-white animate-pulse" />
                                                </div>
                                            </div>

                                            <div className="flex-1 rounded-2xl px-5 py-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-100 shadow-sm backdrop-blur-sm">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em]">
                                                                IN TRANSIT
                                                            </p>
                                                        </div>
                                                        <h3 className="text-[15px] sm:text-[18px] font-bold text-blue-950 truncate">
                                                            {statusData.displayLocation &&
                                                                !statusData.displayLocation.includes(stop.station.toUpperCase()) &&
                                                                !statusData.displayLocation.includes(itinerary[stopIdx + 1].station.toUpperCase())
                                                                ? `Near ${titleCase(statusData.displayLocation)}`
                                                                : `Between ${titleCase(stop.station)} → ${titleCase(itinerary[stopIdx + 1].station)}`}
                                                        </h3>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <p className="text-[10px] sm:text-[11px] font-medium text-blue-500/80 uppercase tracking-wider">
                                                                Next stop: {titleCase(itinerary[stopIdx + 1].station)}
                                                            </p>
                                                        </div>

                                                        {statusData.progressPercent > 0 && (
                                                            <div className="mt-3 h-1 w-full bg-blue-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-blue-500 transition-all duration-1000"
                                                                    style={{ width: `${statusData.progressPercent}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="hidden sm:flex flex-col items-end shrink-0">
                                                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">EXPECTED ARRIVAL</p>
                                                        <p className="text-[14px] font-black text-blue-700">{formatTime(itinerary[stopIdx + 1].timings.act_arr)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
