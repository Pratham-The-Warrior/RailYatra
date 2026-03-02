import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { Route, SearchParams } from "@/types";
import { SearchForm } from "@/components/SearchForm";
import { RouteCard } from "@/components/RouteCard";
import { Calendar, History, ArrowRight, Star } from "lucide-react";

const STORAGE_KEY = 'railyatra_recent_searches';

interface RecentSearch {
    from: string;
    fromDisplay: string;
    to: string;
    toDisplay: string;
    date: string;
}

interface HomeProps {
    onNavigate?: (page: 'home' | 'schedules') => void;
}

export function Home({ onNavigate }: HomeProps) {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

    // Load recent searches from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setRecentSearches(JSON.parse(stored));
        } catch { /* ignore */ }
    }, []);

    const saveRecentSearch = (params: SearchParams, fromDisplay: string, toDisplay: string) => {
        const entry: RecentSearch = { from: params.from, fromDisplay, to: params.to, toDisplay, date: params.date };
        setRecentSearches(prev => {
            const filtered = prev.filter(r => !(r.from === entry.from && r.to === entry.to && r.date === entry.date));
            const updated = [entry, ...filtered].slice(0, 5);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
            return updated;
        });
    };

    const clearRecentSearches = () => {
        setRecentSearches([]);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    };

    const handleSearch = async (params: SearchParams, fromDisplay?: string, toDisplay?: string) => {
        setRoutes([]);
        setSearched(false);
        setLoading(true);
        setError(null);

        try {
            let response: Response;
            try {
                response = await fetch("/api/route", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(params),
                });
            } catch {
                throw new Error("Unable to connect to the server. Sorry for the inconvenience.");
            }

            let data: any;
            try {
                data = await response.json();
            } catch {
                throw new Error("Unable to connect to the server. Sorry for the inconvenience.");
            }

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch routes");
            }

            setRoutes(data);
            setSearched(true);
            if (fromDisplay && toDisplay) saveRecentSearch(params, fromDisplay, toDisplay);
            setTimeout(() => {
                document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Hero Section */}
            <section className="relative pt-32 md:pt-40 pb-16 md:pb-24 px-4 overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-[#fbfafa] via-[#eef2f3] to-transparent pointer-events-none" />
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[700px] rounded-full bg-orange-50/50 blur-3xl pointer-events-none" />
                <div className="absolute top-[10%] right-[-10%] w-[50%] h-[600px] rounded-full bg-green-50/50 blur-3xl pointer-events-none" />

                <div className="relative max-w-7xl mx-auto flex flex-col items-center">
                    <div className="space-y-6 text-center mb-12 relative z-10 w-full">
                        <motion.h1
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [.22, 1, .36, 1] }}
                            className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-light text-slate-800 leading-[1.1] tracking-tight"
                        >
                            Your Gateway to <span className="text-orange-500 font-normal">Smart Rail</span><br />
                            <span className="font-normal text-slate-900">Travel</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.15 }}
                            className="text-lg md:text-xl text-slate-500 font-normal max-w-2xl mx-auto leading-relaxed text-balance"
                        >
                            Fast and Convenient travel for the modern Indian commuter.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.25 }}
                        className="w-full max-w-5xl relative z-20"
                    >
                        <SearchForm onSearch={handleSearch} isLoading={loading} />
                    </motion.div>
                </div>
            </section>

            {/* Quick Services Section */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="max-w-7xl mx-auto px-4 py-8"
            >
                <h2 className="text-xl text-slate-700 font-medium mb-6">Quick Services</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <div
                        onClick={() => onNavigate?.('schedules')}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer flex flex-col items-start group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Calendar size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-800 text-lg mb-1 group-hover:text-blue-600 transition-colors">Train Schedules</h3>
                        <p className="text-xs text-slate-400">View timetable and routes</p>
                    </div>
                </div>
            </motion.section>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 py-8">
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Recent Searches</h2>
                            <button
                                onClick={clearRecentSearches}
                                className="text-orange-500 text-sm font-semibold hover:text-orange-600"
                            >
                                Clear All
                            </button>
                        </div>
                        <div className="space-y-3">
                            {recentSearches.map((r, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleSearch(
                                        { from: r.from, to: r.to, date: r.date, max_switches: 4, max_wait: 600, sort_by: 'switches', top_k: 7 },
                                        r.fromDisplay,
                                        r.toDisplay
                                    )}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-slate-400">
                                            <History size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-[15px]">{r.fromDisplay} → {r.toDisplay}</h4>
                                            <p className="text-xs text-slate-400 mt-0.5">{r.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Special Trains */}
            <section className="max-w-7xl mx-auto px-4 py-12">
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <p className="text-orange-500 text-[11px] font-bold tracking-widest uppercase mb-1">Premium Experience</p>
                        <h2 className="text-3xl font-light text-slate-900">Special Trains</h2>
                    </div>
                    <a href="#" className="flex items-center gap-1 text-slate-600 font-medium hover:text-slate-900 transition-colors text-sm">
                        View all collections <ArrowRight size={16} />
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SpecialTrainCard
                        title="Vande Bharat Express"
                        description="Semi-high speed train with world-class amenities and premium executive classes."
                        image="/vandebharat.png"
                        tag="Fastest"
                        tagColor="bg-green-100 text-green-700"
                        rating="4.9"
                    />
                    <SpecialTrainCard
                        title="Tejas Premium"
                        description="On-board infotainment and personalized attendant services for your luxury journey."
                        image="/tejas.png"
                        tag="Luxury"
                        tagColor="bg-blue-100 text-blue-700"
                        rating="4.7"
                    />
                    <SpecialTrainCard
                        title="Gatiman Express"
                        description="India's first semi-high speed train covering Delhi-Jhansi corridor in record time."
                        image="/gatiman.png"
                        tag="Business"
                        tagColor="bg-orange-100 text-orange-700"
                        rating="4.8"
                    />
                </div>
            </section>

            {/* Results Section */}
            <div id="results" className="max-w-5xl mx-auto px-4 py-8 md:py-0">
                {error && (
                    <div className="mt-8 p-6 bg-red-50 border border-red-100 text-red-600 rounded-3xl text-sm font-bold shadow-sm flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        {error}
                    </div>
                )}

                {searched && routes.length === 0 && !loading && !error && (
                    <div className="mt-20 text-center space-y-4">
                        <div className="text-4xl">🚉</div>
                        <h3 className="text-2xl font-bold text-slate-900">No Optimal Routes Found</h3>
                        <p className="text-slate-500 font-medium">Try increasing your connection window or allowed changes.</p>
                    </div>
                )}

                {routes.length > 0 && (
                    <div className="mt-16 md:mt-24 space-y-8 md:space-y-12">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl md:text-4xl font-black text-slate-900 font-display">Top {routes.length} Optimal Routes</h2>
                            <div className="flex-1 h-px bg-slate-100" />
                        </div>
                        <div className="grid gap-8 md:gap-12">
                            {routes.map((route, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                                >
                                    <RouteCard route={route} index={idx} />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

interface SpecialTrainCardProps {
    title: string;
    description: string;
    image: string;
    tag: string;
    tagColor: string;
    rating: string;
}

function SpecialTrainCard({ title, description, image, tag, tagColor, rating }: SpecialTrainCardProps) {
    return (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 flex flex-col">
            <div className="h-56 bg-slate-200 w-full relative overflow-hidden group">
                <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <span className={`${tagColor} text-[10px] uppercase font-bold px-2 py-1 rounded-full tracking-wider`}>{tag}</span>
                    <div className="flex items-center gap-1 text-orange-500 text-xs font-bold">
                        <Star size={12} fill="currentColor" /> {rating}
                    </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 mb-6 flex-1">{description}</p>
                <div className="flex gap-2">
                    <button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors">View Routes</button>
                    <button className="w-12 h-12 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors">
                        <HeartIcon />
                    </button>
                </div>
            </div>
        </div>
    );
}

function HeartIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
    )
}
