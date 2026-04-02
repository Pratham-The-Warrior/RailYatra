import { RotateCcw } from 'lucide-react';
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
                    <div className="bg-white rounded-2xl md:rounded-[40px] p-4 sm:p-6 md:p-10 lg:px-14 mb-5 sm:mb-8 md:mb-10 shadow-sm border border-slate-100">
                        {/* Desktop hero layout */}
                        <div className="hidden md:flex flex-row justify-between items-center gap-12">
                            <div className="flex-1 min-w-0">
                                <p className="font-sans text-[11px] sm:text-[12px] font-black text-orange-600 uppercase tracking-[0.2em] mb-2">
                                    TRAIN #{meta.train_no}
                                </p>
                                <h1 className="font-sans text-3xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-4 capitalize">
                                    {isMoving && itinerary[activeIdx + 1]
                                        ? `Running between ${itinerary[activeIdx].station.toLowerCase()} and ${itinerary[activeIdx + 1].station.toLowerCase()}`
                                        : meta.current_location.replace(/\s+at\s+\d{1,2}:\d{2}.*$/i, '').toLowerCase()}
                                </h1>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className={`px-3 py-1.5 rounded flex items-center gap-2 ${heroStop?.is_delayed ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${heroStop?.is_delayed ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                                            {heroStop?.is_delayed ? heroStop.status.toUpperCase().replace('MIN', 'M LATE') : 'ON TIME'}
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
                                <div className="bg-slate-800 rounded-2xl p-6 text-white min-w-[160px] shadow-2xl shadow-slate-200 flex flex-col items-center justify-center">
                                    <p className="font-outfit text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">PLATFORM</p>
                                    <p className="font-outfit text-4xl font-black tracking-tighter">
                                        {heroStop?.platform ? (
                                            heroStop.platform.toUpperCase().includes('PF') ? heroStop.platform.toUpperCase() : `PF ${heroStop.platform}`
                                        ) : 'PF 3'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Mobile hero layout */}
                        <div className="md:hidden">
                            <div className="flex items-center justify-between mb-3">
                                <p className="font-sans text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">
                                    TRAIN #{meta.train_no}
                                </p>
                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
                                    <span className="font-mono text-[9px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                        {meta.fetched_at.split(' ')[1] || meta.fetched_at}
                                    </span>
                                </div>
                            </div>

                            <h1 className="font-sans text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-3 capitalize">
                                {isMoving && itinerary[activeIdx + 1]
                                    ? `Running between ${itinerary[activeIdx].station.toLowerCase()} and ${itinerary[activeIdx + 1].station.toLowerCase()}`
                                    : meta.current_location.replace(/\s+at\s+\d{1,2}:\d{2}.*$/i, '').toLowerCase()}
                            </h1>

                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                                <div className={`px-2.5 py-1 rounded flex items-center gap-1.5 ${heroStop?.is_delayed ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <div className={`w-1 h-1 rounded-full ${heroStop?.is_delayed ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                                    <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
                                        {heroStop?.is_delayed ? heroStop.status.toUpperCase().replace('MIN', 'M LATE') : 'ON TIME'}
                                    </span>
                                </div>
                                <span className="text-xs font-medium text-slate-500 capitalize truncate">
                                    {heroActionText} • <span className="font-bold text-slate-700">{heroParsed.time}</span>
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                    Platform {heroStop?.platform ? heroStop.platform.replace(/PF\s?/i, '') : '3'}
                                </span>
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

                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 lg:gap-10">
                        <JourneyTimeline
                            statusData={statusData}
                            activeIdx={activeIdx}
                            isMoving={isMoving}
                        />

                        <TrackingSidebar
                            totalStations={totalStations}
                            coveredStations={coveredStations}
                            remainingTime={remainingTime}
                            avgSpeed={statusData.avgSpeed}
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
