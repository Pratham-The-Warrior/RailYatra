import { Info, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { LiveStatusResponse, parseTimeAndDate } from '../../pages/LiveStatus';
import { JourneyTimeline } from './JourneyTimeline';
import { TrackingSidebar } from './TrackingSidebar';
import { BackButton } from '../Common/BackButton';

interface TrackingResultsProps {
    statusData: LiveStatusResponse;
    onRefresh: () => void;
    refreshing: boolean;
    onBack: () => void;
    resultsRef: React.RefObject<HTMLDivElement | null>;
}

export const TrackingResults: React.FC<TrackingResultsProps> = ({
    statusData, onRefresh, refreshing, onBack, resultsRef
}) => {
    const meta = statusData.meta;
    const itinerary = statusData.itinerary;

    const activeIdx = statusData.activeIdx;
    const isMoving = statusData.isMoving;
    const activeStop = itinerary[activeIdx] || itinerary[0];

    const totalStations = statusData.totalStations;
    const coveredStations = statusData.coveredStationsCount;
    const remainingTime = statusData.remainingTime;


    let heroActionText = "";
    let heroRawTime = "";
    let heroStop = activeStop;

    if (activeIdx === 0 && !isMoving) {
        heroActionText = "Scheduled Departure";
        heroRawTime = activeStop?.timings.sch_dep || '';
    } else if (isMoving && itinerary[activeIdx + 1]) {
        heroStop = itinerary[activeIdx + 1];
        heroActionText = `Expected at ${heroStop.station.toLowerCase()}`;
        heroRawTime = heroStop.timings.act_arr !== '--' ? heroStop.timings.act_arr : heroStop.timings.sch_arr;
    } else {
        heroActionText = "Arrived";
        heroRawTime = activeStop?.timings.act_arr !== '--' ? activeStop?.timings.act_arr : activeStop?.timings.sch_arr || '';
    }

    const heroParsed = parseTimeAndDate(heroRawTime || '');

    // Timetable estimates know no delays: say "as per timetable", never "on time".
    const isEstimate = statusData.source === 'timetable';
    const badgeText = heroStop?.is_delayed
        ? heroStop.status.toUpperCase().replace('MIN', 'M LATE')
        : isEstimate ? 'AS PER TIMETABLE' : 'ON TIME';
    const badgeClass = heroStop?.is_delayed ? 'bg-red-50 text-red-600'
        : isEstimate ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600';
    const dotClass = heroStop?.is_delayed ? 'bg-red-500'
        : isEstimate ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse';
    const platformLabel = heroStop?.platform
        ? (heroStop.platform.toUpperCase().includes('PF') ? heroStop.platform.toUpperCase() : `PF ${heroStop.platform}`)
        : null;
    const trainLabel = `TRAIN #${meta.train_no}${meta.train_name ? ` · ${meta.train_name}` : ''}`;

    return (
        <div className="min-h-screen pt-16 md:pt-20 pb-10 md:pb-16 bg-[#f8fafc] overflow-x-hidden font-sans">
            <div ref={resultsRef} className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <BackButton onClick={onBack} label="Back to Search" sticky offset={64} className="mb-5 sm:mb-8" />

                    {/* ═══ HERO CARD ═══ */}
                    <div className="bg-white rounded-2xl md:rounded-[40px] p-4 sm:p-6 md:p-10 lg:px-14 mb-5 sm:mb-8 md:mb-10 shadow-xs border border-slate-100">
                        {/* Desktop hero layout */}
                        <div className="hidden md:flex flex-row justify-between items-center gap-12">
                            <div className="flex-1 min-w-0">
                                <p className="font-sans text-[11px] sm:text-[12px] font-black text-orange-600 uppercase tracking-[0.2em] mb-2">
                                    {trainLabel}
                                </p>
                                <h1 className="font-sans text-3xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight sm:leading-9 lg:leading-10 mb-4 capitalize">
                                    {isMoving && itinerary[activeIdx + 1]
                                        ? `Running between ${itinerary[activeIdx].station.toLowerCase()} and ${itinerary[activeIdx + 1].station.toLowerCase()}`
                                        : meta.current_location.replace(/\s+at\s+\d{1,2}:\d{2}.*$/i, '').toLowerCase()}
                                </h1>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className={`px-3 py-1.5 rounded-sm flex items-center gap-2 ${badgeClass}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                                            {badgeText}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-500 capitalize">
                                        {heroActionText} • <span className="font-bold text-slate-700">{heroParsed.time}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right flex flex-col items-end gap-3">
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
                                        <span className="font-mono text-[10px] font-bold text-slate-700 uppercase tracking-widest whitespace-nowrap">
                                            LAST UPDATED: {meta.fetched_at.split(' ')[1] || meta.fetched_at}
                                        </span>
                                    </div>
                                    <button
                                        onClick={onRefresh}
                                        className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity"
                                    >
                                        <RotateCcw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                                        REFRESH STATUS
                                    </button>
                                </div>
                                {platformLabel && (
                                    <div className="bg-slate-800 rounded-2xl p-6 text-white min-w-[160px] shadow-2xl shadow-slate-200 flex flex-col items-center justify-center">
                                        <p className="font-outfit text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">PLATFORM</p>
                                        <p className="font-outfit text-4xl font-black tracking-tighter">{platformLabel}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile hero layout */}
                        <div className="md:hidden">
                            <div className="flex items-center justify-between mb-3">
                                <p className="font-sans text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">
                                    {trainLabel}
                                </p>
                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
                                    <span className="font-mono text-[9px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                        {meta.fetched_at.split(' ')[1] || meta.fetched_at}
                                    </span>
                                </div>
                            </div>

                            <h1 className="font-sans text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight sm:leading-8 mb-3 capitalize">
                                {isMoving && itinerary[activeIdx + 1]
                                    ? `Running between ${itinerary[activeIdx].station.toLowerCase()} and ${itinerary[activeIdx + 1].station.toLowerCase()}`
                                    : meta.current_location.replace(/\s+at\s+\d{1,2}:\d{2}.*$/i, '').toLowerCase()}
                            </h1>

                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                                <div className={`px-2.5 py-1 rounded-sm flex items-center gap-1.5 ${badgeClass}`}>
                                    <div className={`w-1 h-1 rounded-full ${dotClass}`} />
                                    <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
                                        {badgeText}
                                    </span>
                                </div>
                                <span className="text-xs font-medium text-slate-500 capitalize truncate">
                                    {heroActionText} • <span className="font-bold text-slate-700">{heroParsed.time}</span>
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {platformLabel && (
                                    <span className="bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                        {platformLabel}
                                    </span>
                                )}
                                <button
                                    onClick={onRefresh}
                                    className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5 hover:opacity-80 transition-opacity ml-auto"
                                >
                                    <RotateCcw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                                    REFRESH
                                </button>
                            </div>
                        </div>
                    </div>

                    {statusData.notice && (
                        <div role="note" className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 -mt-1 sm:-mt-3 md:-mt-4 mb-5 sm:mb-8">
                            <Info className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
                            <p className="text-xs sm:text-sm font-medium leading-relaxed">{statusData.notice}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 lg:gap-10">
                        <JourneyTimeline
                            statusData={statusData}
                            activeIdx={activeIdx}
                            isMoving={isMoving}
                            isEstimate={isEstimate}
                        />

                        <TrackingSidebar
                            totalStations={totalStations}
                            coveredStations={coveredStations}
                            remainingTime={remainingTime}
                            avgSpeed={statusData.avgSpeed}
                            isEstimate={isEstimate}
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
