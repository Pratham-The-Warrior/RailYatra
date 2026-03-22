import React from 'react';
import { Train } from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchHeroProps {
    trainNumber: string;
    setTrainNumber: (val: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onTrack: (num: string) => void;
}

export const SearchHero: React.FC<SearchHeroProps> = ({
    trainNumber, setTrainNumber, onSubmit, onTrack
}) => {
    return (
        <>
            {/* Hero Text */}
            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-[28px] sm:text-4xl md:text-[56px] font-extrabold text-[#111827] font-display leading-[1.1] mb-5 sm:mb-8 tracking-tight"
            >
                Where is your <span className="text-orange-500">Train?</span>
            </motion.h1>

            {/* Giant Search Input */}
            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                onSubmit={onSubmit}
                className="max-w-3xl mx-auto mb-6 relative group"
            >
                {/* Desktop: pill layout with inline button */}
                <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-full p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgb(249,115,22,0.1)] transition-shadow">
                    <div className="pl-4 pr-2 text-slate-400">
                        <Train className="w-6 h-6" />
                    </div>
                    <input
                        type="text"
                        value={trainNumber}
                        onChange={e => setTrainNumber(e.target.value)}
                        placeholder="Enter Train Number or Name (e.g. 12002 or Bhopal Shatabdi)"
                        className="w-full bg-transparent border-none text-slate-800 text-base font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0 px-2 py-3"
                    />
                    <button
                        type="submit"
                        className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3.5 rounded-full transition-colors uppercase tracking-widest text-sm shadow-md shadow-orange-500/20"
                    >
                        TRACK
                    </button>
                </div>

                {/* Mobile: stacked layout */}
                <div className="sm:hidden flex flex-col gap-3">
                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                        <Train className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
                        <input
                            type="text"
                            value={trainNumber}
                            onChange={e => setTrainNumber(e.target.value)}
                            placeholder="Train Number (e.g. 12002)"
                            className="w-full bg-transparent border-none text-slate-800 text-[15px] font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl transition-colors uppercase tracking-widest text-sm shadow-md shadow-orange-500/20 active:scale-[0.97]"
                    >
                        TRACK TRAIN
                    </button>
                </div>
            </motion.form>

            {/* Popular Pills */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-10 md:mb-16"
            >
                <span>POPULAR:</span>
                {[
                    { no: '22436', name: 'Vande Bharat' },
                    { no: '12951', name: 'Rajdhani Exp' },
                    { no: '12002', name: 'Shatabdi' },
                ].map(t => (
                    <button
                        key={t.no}
                        onClick={() => onTrack(t.no)}
                        className="bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors font-medium flex items-center gap-1.5"
                    >
                        <span className="font-bold">{t.no}</span> <span className="capitalize tracking-normal hidden sm:inline">{t.name}</span>
                    </button>
                ))}
            </motion.div>
        </>
    );
};
