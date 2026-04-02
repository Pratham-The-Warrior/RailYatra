import React from 'react';
import { motion } from 'framer-motion';
import {
    Search, Calendar, FileText, ArrowRight,
    Wifi, UtensilsCrossed, Plug, Cross, Activity, HelpCircle,
    Clock, MapPin
} from 'lucide-react';
import { TrainSchedule, ScheduleItem } from '../../pages/Schedules'; // Assume types are in types.ts or exported from Schedules.tsx
import { titleCase, computeHalt } from '../../pages/Schedules';
import { BackButton } from '../Common/BackButton';

interface SchedulesResultProps {
    schedule: TrainSchedule;
    trainNumber: string;
    setTrainNumber: (val: string) => void;
    handleSubmit: (e: React.FormEvent) => void;
    handleBack: () => void;
    resultsRef: React.RefObject<HTMLDivElement | null>;
}

export const SchedulesResult: React.FC<SchedulesResultProps> = ({
    schedule, trainNumber, setTrainNumber, handleSubmit, handleBack, resultsRef
}) => {
    const isDailyService = schedule?.operating_days ? Object.values(schedule.operating_days).every(Boolean) : false;
    const src = schedule?.schedule?.[0];
    const dest = schedule?.schedule?.[schedule.schedule.length - 1];

    const amenities = [
        { icon: UtensilsCrossed, label: 'Onboard Catering', color: '#ea580c' },
        { icon: Wifi, label: 'High Speed WiFi', color: '#2563eb' },
        { icon: Plug, label: 'Charging Points', color: '#ca8a04' },
        { icon: Cross, label: 'First Aid', color: '#dc2626' },
    ];

    return (
        <div className="min-h-screen pt-20 md:pt-24 pb-12 md:pb-20 bg-[#f5f6f8]">
            <div ref={resultsRef} className="max-w-[1120px] mx-auto px-3 md:px-5">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [.22, 1, .36, 1] }}
                >
                    {/* ── Top bar: back + mini search ── */}
                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                        <BackButton onClick={handleBack} sticky offset={64} className="md:static" />
                        <form onSubmit={handleSubmit} className="relative ml-auto max-w-[180px] md:max-w-[220px] hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={trainNumber}
                                onChange={e => setTrainNumber(e.target.value)}
                                placeholder="Train No / Name"
                                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100 transition-all placeholder:text-slate-400"
                            />
                        </form>
                    </div>

                    {/* ═══════ TRAIN HEADER ═══════ */}
                    <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 md:p-7 mb-4 md:mb-5">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                            <div className="space-y-2.5">
                                <span className={`inline-block text-[11px] font-bold px-2.5 py-[3px] rounded-full border leading-none ${isDailyService
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                    : 'text-orange-600 bg-orange-50 border-orange-200'
                                    }`}>
                                    {isDailyService ? 'Daily Service' : 'Limited Service'}
                                </span>
                                <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 leading-tight font-display tracking-tight">
                                    {schedule!.train_number} – {titleCase(schedule!.train_name)}
                                </h1>
                                {src && dest && (
                                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium text-slate-500">
                                        <span className="text-slate-700">{titleCase(src.station_name)} ({src.station_code})</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                        <span className="text-slate-700">{titleCase(dest.station_name)} ({dest.station_code})</span>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 md:gap-2.5 shrink-0 mt-4 lg:mt-0">
                                <button className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 md:px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm shadow-orange-500/15 active:scale-[0.97]">
                                    <Calendar className="w-4 h-4" />
                                    Check Availability
                                </button>
                                <button className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 md:px-5 py-2.5 rounded-lg text-sm transition-all active:scale-[0.97]">
                                    <Activity className="w-4 h-4" />
                                    Live Status
                                </button>
                                {schedule!.hasPdf && (
                                    <a href="#" target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2.5 rounded-lg text-sm transition-all active:scale-[0.97]">
                                        <FileText className="w-4 h-4" />
                                        Download PDF
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ═══════ AMENITY STRIP ═══════ */}
                    <div className="flex flex-wrap items-center gap-x-4 md:gap-x-8 gap-y-2 md:gap-y-3 pl-1 mb-5 md:mb-8">
                        {amenities.map(({ icon: Icon, label, color }) => (
                            <div key={label} className="flex items-center gap-1.5 md:gap-2.5 text-xs md:text-sm font-medium text-slate-600">
                                <Icon className="w-4 h-4 md:w-[18px] md:h-[18px]" style={{ color }} />
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* ═══════ MAIN GRID ═══════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 md:gap-5 items-start">
                        {/* ── TIMETABLE ── */}
                        <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900 font-display">Detailed Timetable</h2>
                                <span className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Effective Feb 2026</span>
                            </div>
                            <div className="overflow-x-auto">
                                <div className="min-w-full sm:min-w-[540px]">
                                    <div className="grid grid-cols-[1fr_100px] sm:grid-cols-[1fr_140px_72px_72px_64px] px-4 md:px-6 py-2.5 md:py-3 border-b border-slate-100 bg-slate-50/50">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Station</span>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Arrive/Depart</span>
                                        <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] text-center">Halt</span>
                                        <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] text-center">Dist.</span>
                                        <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] text-center">Day</span>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {schedule!.schedule.map((stop: ScheduleItem, idx: number) => {
                                            const isFirst = idx === 0;
                                            const isLast = idx === schedule!.schedule.length - 1;
                                            const halt = computeHalt(stop.arrival_time, stop.departure_time);

                                            let dotBg = 'bg-slate-300';
                                            if (isFirst || isLast) dotBg = 'bg-emerald-500';

                                            let ad = `${stop.arrival_time ?? '--'} / ${stop.departure_time ?? '--'}`;
                                            if (isFirst) ad = `Starts / ${stop.departure_time ?? '--'}`;
                                            if (isLast) ad = `${stop.arrival_time ?? '--'} / Ends`;

                                            return (
                                                <div key={stop.sequence_number || idx}
                                                    className="grid grid-cols-[1fr_100px] sm:grid-cols-[1fr_140px_72px_72px_64px] items-center px-4 md:px-6 py-3 md:py-4 transition-colors hover:bg-slate-50/60">
                                                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                                        <span className={`w-[8px] h-[8px] sm:w-[9px] sm:h-[9px] rounded-full ${dotBg} shrink-0`} />
                                                        <div className="min-w-0">
                                                            <p className="text-xs sm:text-sm font-semibold leading-tight truncate text-slate-800">{titleCase(stop.station_name)}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-[0.06em]">{stop.station_code}</p>
                                                                <span className="sm:hidden text-[10px] text-slate-300">•</span>
                                                                <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">Day {stop.day_of_journey}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col sm:block min-w-0">
                                                        <span className="text-xs sm:text-sm font-medium text-slate-600 truncate">{ad.replace('Starts / ', '').replace(' / Ends', '')}</span>
                                                        <div className="sm:hidden flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] text-slate-400">{halt === '--' ? 'No halt' : `Halt ${halt}`}</span>
                                                        </div>
                                                    </div>
                                                    <span className="hidden sm:inline-block text-xs md:text-sm font-medium text-center text-slate-500">{halt}</span>
                                                    <span className="hidden sm:inline-block text-xs md:text-sm font-medium text-center text-slate-500">{Math.round(stop.distance_km)} km</span>
                                                    <div className="hidden sm:flex justify-center">
                                                        <span className="text-[11px] font-bold px-2 py-[3px] rounded leading-none border border-slate-200 text-slate-600">
                                                            Day {stop.day_of_journey}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── SIDEBAR ── */}
                        <div className="space-y-5">
                            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                                        <HelpCircle className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 leading-snug">Need Help?</h3>
                                        <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">Talk to our travel experts for easy bookings.</p>
                                    </div>
                                </div>
                                <a href="#" className="text-orange-500 hover:text-orange-600 text-sm font-bold transition-colors">Contact Support</a>
                            </div>

                            {src && dest && (() => {
                                // Compute duration
                                const depTime = src.departure_time ?? '00:00';
                                const arrTime = dest.arrival_time ?? '00:00';
                                const [dh, dm] = depTime.split(':').map(Number);
                                const [ah, am] = arrTime.split(':').map(Number);
                                let totalMin = (ah * 60 + am) - (dh * 60 + dm) + (dest.day_of_journey - src.day_of_journey) * 24 * 60;
                                if (totalMin < 0) totalMin += 24 * 60;
                                const hours = Math.floor(totalMin / 60);
                                const mins = totalMin % 60;
                                const distKm = Math.round(dest.distance_km);
                                const avgSpeed = totalMin > 0 ? Math.round(distKm / (totalMin / 60)) : 0;

                                const stats = [
                                    { label: 'Total Distance', value: `${distKm} km`, color: 'bg-orange-500', icon: <MapPin className="w-4 h-4 text-white" /> },
                                    { label: 'Total Duration', value: `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`, color: 'bg-emerald-500', icon: <Clock className="w-4 h-4 text-white" /> },
                                    { label: 'Avg. Speed', value: `${avgSpeed} km/h`, color: 'bg-blue-500', icon: <Activity className="w-4 h-4 text-white" /> },
                                ];

                                return (
                                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
                                        <h3 className="text-sm font-bold text-slate-900 mb-5">Journey Stats</h3>
                                        <div className="space-y-4">
                                            {stats.map((stat, i) => (
                                                <React.Fragment key={stat.label}>
                                                    <div className="flex items-center gap-3.5">
                                                        <div className={`w-9 h-9 rounded-full ${stat.color} flex items-center justify-center shrink-0 shadow-sm`}>
                                                            {stat.icon}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] text-slate-400 font-medium leading-none mb-1">{stat.label}</p>
                                                            <p className="text-base font-bold text-slate-900 leading-none">{stat.value}</p>
                                                        </div>
                                                    </div>
                                                    {i < stats.length - 1 && <div className="border-t border-slate-100" />}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* ═══════ ROUTE VISUALIZER ═══════ */}
                    {src && dest && (
                        <div className="mt-7 bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900 font-display">Route Visualizer</h2>
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                                    <span className="w-[10px] h-[10px] rounded-full bg-orange-400" />
                                    Active Path
                                </div>
                            </div>
                            <div className="relative h-[240px] md:h-[360px] bg-[#f0f2f5] overflow-hidden">
                                <div className="absolute inset-0" style={{
                                    backgroundImage: 'linear-gradient(rgba(148,163,184,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,0.06) 1px,transparent 1px)',
                                    backgroundSize: '40px 40px'
                                }} />
                                <div className="absolute inset-0" style={{
                                    backgroundImage: 'linear-gradient(rgba(148,163,184,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,0.03) 1px,transparent 1px)',
                                    backgroundSize: '10px 10px'
                                }} />
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 700 360" preserveAspectRatio="xMidYMid meet">
                                    <path d="M 90 55 C 140 70,180 120,240 150 S 340 190,380 210 Q 430 240,480 270 T 570 310 Q 590 320,610 330"
                                        stroke="#f97316" strokeWidth="2.5" fill="none" strokeDasharray="6 4" opacity="0.6" />
                                    <path d="M 90 55 C 140 70,180 120,240 150 S 340 190,380 210 Q 430 240,480 270 T 570 310 Q 590 320,610 330"
                                        stroke="#f97316" strokeWidth="2.5" fill="none" opacity="0.25" />
                                    {schedule!.schedule.map((stop: ScheduleItem, i: number) => {
                                        const n = schedule!.schedule.length - 1;
                                        const t = n === 0 ? 0 : i / n;
                                        const cx = 90 + t * 520;
                                        const cy = 55 + t * 275 + Math.sin(t * Math.PI) * -20;
                                        const isEnd = i === 0 || i === n;
                                        return (
                                            <g key={stop.sequence_number}>
                                                {isEnd && <circle cx={cx} cy={cy} r="7" fill="#f9731620" />}
                                                <circle cx={cx} cy={cy} r={isEnd ? 4.5 : 3} fill={i === 0 ? '#10b981' : i === n ? '#f97316' : '#f9731680'} />
                                            </g>
                                        );
                                    })}
                                </svg>
                                <div className="absolute top-5 left-5 md:left-8">
                                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-3 py-2">
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider leading-none mb-1">Start</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-[7px] h-[7px] rounded-full bg-emerald-500 shrink-0" />
                                            <p className="text-[13px] font-bold text-slate-900 leading-none">{titleCase(src.station_name)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-5 right-5 md:right-8">
                                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-3 py-2">
                                        <p className="text-[9px] font-bold text-orange-600 uppercase tracking-wider leading-none mb-1">End</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-[7px] h-[7px] rounded-full bg-orange-500 shrink-0" />
                                            <p className="text-[13px] font-bold text-slate-900 leading-none">{titleCase(dest.station_name)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-5 right-5 md:right-8 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 px-3 py-1.5 shadow-sm">
                                    <p className="text-[12px] font-bold text-slate-600">{Math.round(dest.distance_km)}km Total</p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};
