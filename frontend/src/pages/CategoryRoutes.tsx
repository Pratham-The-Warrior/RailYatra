import React, { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Train, Sparkles, Clock, ChevronRight } from "lucide-react";

interface TrainRoute {
    train_number: string;
    train_name: string;
    type: string;
    classes_available: string[];
    operating_days: Record<string, boolean>;
    source: {
        station_code: string;
        station_name: string;
        departure_time: string;
    };
    destination: {
        station_code: string;
        station_name: string;
        arrival_time: string;
    };
}

interface CategoryRoutesProps {
    category: string;
    categoryName: string;
    onNavigate: (page: 'home' | 'schedules' | 'category-routes') => void;
    onViewTrain: (trainNumber: string) => void;
}

export const CategoryRoutes: React.FC<CategoryRoutesProps> = ({
    category,
    categoryName,
    onNavigate,
    onViewTrain
}) => {
    const [trains, setTrains] = useState<TrainRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchTrains = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/category/${category}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Failed to fetch ${categoryName} routes`);
                }
                const data = await response.json();
                setTrains(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        };
        fetchTrains();
    }, [category, categoryName]);

    const filteredTrains = trains.filter(t =>
        t.train_number.includes(searchQuery) ||
        t.train_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.source.station_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.destination.station_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const titleCase = (s: string): string =>
        s.toLowerCase().split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20 pt-16 md:pt-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-16 md:top-20 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onNavigate('home')}
                            className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-orange-500" />
                                <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">Premium Collections</span>
                            </div>
                            <h1 className="text-xl font-bold text-slate-900">{categoryName} Routes</h1>
                        </div>
                    </div>

                    <div className="relative hidden md:block w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by number, name or station..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
                {/* Mobile Search */}
                <div className="relative md:hidden mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search routes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                    />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin mb-4" />
                        <p className="text-slate-500 font-medium">Preparing the {categoryName} chart...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                        <p className="text-red-600 font-bold mb-2">Oops! Something went wrong</p>
                        <p className="text-red-500 text-sm">{error}</p>
                        <button
                            onClick={() => onNavigate('home')}
                            className="mt-4 text-orange-600 font-bold text-sm hover:underline"
                        >
                            Return to Home
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Desktop View */}
                        <div className="hidden lg:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sr. No.</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Train Info</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source & Dep.</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider"></th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dest. & Arr.</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Runs On</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTrains.map((train, idx) => (
                                        <motion.tr
                                            key={train.train_number}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="hover:bg-slate-50 transition-colors group"
                                        >
                                            <td className="px-6 py-5">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-sm">
                                                        <Train size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{train.train_number}</h3>
                                                        <p className="text-xs text-slate-500 line-clamp-1">{train.train_name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div>
                                                    <p className="font-semibold text-slate-800">{titleCase(train.source.station_name)}</p>
                                                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                                        <Clock size={12} /> {train.source.departure_time}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-20 h-[2px] bg-slate-200 relative">
                                                        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div>
                                                    <p className="font-semibold text-slate-800">{titleCase(train.destination.station_name)}</p>
                                                    <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                                                        <Clock size={12} /> {train.destination.arrival_time}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex gap-1">
                                                    {days.map((day, dIdx) => (
                                                        <div
                                                            key={day}
                                                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${train.operating_days[day]
                                                                ? 'bg-orange-100 text-orange-600'
                                                                : 'bg-slate-100 text-slate-300'
                                                                }`}
                                                        >
                                                            {dayLabels[dIdx]}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <button
                                                    onClick={() => onViewTrain(train.train_number)}
                                                    className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                                                >
                                                    View Details
                                                    <ChevronRight size={14} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile/Card View */}
                        <div className="lg:hidden divide-y divide-slate-100">
                            {filteredTrains.map((train) => (
                                <div
                                    key={train.train_number}
                                    onClick={() => onViewTrain(train.train_number)}
                                    className="p-5 active:bg-slate-50 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100 mb-1 inline-block">
                                                {train.train_number}
                                            </span>
                                            <h3 className="font-bold text-slate-900">{train.train_name}</h3>
                                        </div>
                                        <div className="flex gap-0.5">
                                            {days.map((day, dIdx) => (
                                                <span
                                                    key={day}
                                                    className={`w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold ${train.operating_days[day]
                                                        ? 'bg-orange-500 text-white'
                                                        : 'bg-slate-100 text-slate-300'
                                                        }`}
                                                >
                                                    {dayLabels[dIdx]}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between relative px-2">
                                        <div className="text-center">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Departure</p>
                                            <p className="text-sm font-bold text-slate-800">{train.source.departure_time}</p>
                                            <p className="text-[11px] font-medium text-slate-500 mt-1">{train.source.station_code}</p>
                                        </div>

                                        <div className="flex-1 px-4 flex flex-col items-center">
                                            <div className="w-full h-px bg-slate-200 relative">
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                                                    <Train size={14} className="text-slate-300" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-center">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Arrival</p>
                                            <p className="text-sm font-bold text-slate-800">{train.destination.arrival_time}</p>
                                            <p className="text-[11px] font-medium text-slate-500 mt-1">{train.destination.station_code}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex gap-1">
                                            {train.classes_available.map(c => (
                                                <span key={c} className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                        <span className="text-xs font-bold text-orange-500 flex items-center gap-1">
                                            View Schedule <ChevronRight size={14} />
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredTrains.length === 0 && !loading && (
                            <div className="py-20 text-center">
                                <Search size={40} className="mx-auto text-slate-200 mb-4" />
                                <h3 className="text-lg font-bold text-slate-900">No matching routes</h3>
                                <p className="text-sm text-slate-500">Try searching with a different keyword</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
