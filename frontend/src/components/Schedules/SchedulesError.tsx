import React from 'react';
import { motion } from 'framer-motion';
import { Train, Search, MapPin, HelpCircle } from 'lucide-react';

interface SchedulesErrorProps {
    error: string;
    setError: (val: string | null) => void;
}

export const SchedulesError: React.FC<SchedulesErrorProps> = ({ error, setError }) => {
    return (
        <div className="min-h-screen pt-20 md:pt-24 pb-12 md:pb-20 bg-[#f5f6f8] flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [.22, 1, .36, 1] }}
                className="bg-white rounded-2xl md:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full mx-4 p-6 md:p-10 text-center"
            >
                {/* Icon circle */}
                <div className="flex justify-center mb-7">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-slate-100 flex items-center justify-center relative">
                        <div className="w-16 h-16 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                            <Train className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/30">
                            <Search className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </div>

                {/* Heading */}
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 font-display mb-2 md:mb-3">
                    Oops! No Train Found
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-xs mx-auto">
                    {error || "We couldn't find any trains matching your search. Please check the train name or number and try again."}
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                    <button
                        onClick={() => { setError(null); }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-md shadow-orange-500/20 active:scale-[0.97]"
                    >
                        <Search className="w-4 h-4" />
                        Try Another Search
                    </button>
                    <button
                        onClick={() => { setError(null); }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border-2 border-emerald-500 text-emerald-600 font-bold px-6 py-3 rounded-xl text-sm transition-all hover:bg-emerald-50 active:scale-[0.97]"
                    >
                        <MapPin className="w-4 h-4" />
                        View Popular Routes
                    </button>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-5">
                    <p className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Need assistance with your booking?
                    </p>
                    <a href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-2 transition-colors">
                        Contact RailYatra Support
                    </a>
                </div>
            </motion.div>
        </div>
    );
};
