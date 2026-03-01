import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Station } from '@/types';

interface StationSearchInputProps {
    value: string;
    onChange: (code: string, display: string) => void;
    placeholder: string;
}

export const StationSearchInput: React.FC<StationSearchInputProps> = ({ value, onChange, placeholder }) => {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<Station[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        const fetchStations = async () => {
            if (query.length < 2) return;
            try {
                const res = await fetch(`/api/stations?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const text = await res.text();
                    if (text) {
                        const data = JSON.parse(text);
                        setSuggestions(data);
                    }
                }
            } catch {
                /* station fetch failed silently */
            }
        };
        const timer = setTimeout(fetchStations, 200);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (s: Station) => {
        const display = `${s.name} (${s.code})`;
        setQuery(display);
        onChange(s.code, display);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                    <MapPin size={18} />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    placeholder={placeholder}
                />
            </div>

            <AnimatePresence>
                {isOpen && suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-900/5"
                    >
                        <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                            {suggestions.map((s) => (
                                <button
                                    key={s.code}
                                    onClick={() => handleSelect(s)}
                                    className="w-full px-4 py-3 hover:bg-orange-50 rounded-xl flex items-center justify-between text-left transition-all group"
                                    type="button"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 group-hover:text-orange-600 transition-colors">{s.name}</span>
                                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-orange-400 uppercase tracking-wider">{s.code}</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-orange-100 group-hover:text-orange-600 group-hover:border-orange-200 transition-all">
                                        <MapPin size={14} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
