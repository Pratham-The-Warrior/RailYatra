import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2, X } from 'lucide-react';
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
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
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
        if (query.length < 2) {
            setSuggestions([]);
            setIsLoading(false);
            return;
        }

        // Only fetch if query doesn't match the current display value 
        // to avoid re-fetching after selection.
        if (value && query === value) {
            return;
        }

        const abortController = new AbortController();
        setIsLoading(true);

        const fetchStations = async () => {
            try {
                const res = await fetch(`/api/stations?q=${encodeURIComponent(query)}`, {
                    signal: abortController.signal
                });
                if (res.ok) {
                    const text = await res.text();
                    if (text) {
                        const data = JSON.parse(text);
                        setSuggestions(data);
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    // silently handle fetch failures
                }
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchStations, 250);
        return () => {
            clearTimeout(timer);
            abortController.abort();
        };
    }, [query, value]);

    useEffect(() => {
        setSelectedIndex(-1);
    }, [suggestions, isOpen]);

    const handleSelect = (s: Station) => {
        const display = `${s.name} (${s.code})`;
        setQuery(display);
        onChange(s.code, display);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                setIsOpen(true);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
            // Optional: scroll selected item into view could be added here
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                handleSelect(suggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
        }
    };

    const highlightMatch = (text: string, q: string) => {
        if (!q) return text;
        const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQ})`, 'gi');
        const parts = text.split(regex);
        return (
            <>
                {parts.map((part, i) => 
                    regex.test(part) ? <span key={i} className="text-orange-600 bg-orange-100/50 rounded px-0.5 font-extrabold">{part}</span> : part
                )}
            </>
        );
    };

    const showDropdown = isOpen && query.length >= 2;

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                    <MapPin size={18} />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => { 
                        setQuery(e.target.value); 
                        if (!isOpen) setIsOpen(true); 
                        // If typed, clear actual selection until explicit pick to prevent stale state
                        if (e.target.value !== value && value !== '') {
                            onChange('', '');
                        }
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-10 py-3.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    placeholder={placeholder}
                />
                
                {query.length > 0 && (
                    <button 
                        type="button" 
                        onClick={() => {
                            setQuery('');
                            onChange('', '');
                            setIsOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 focus:outline-none"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showDropdown && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-900/5"
                    >
                        <div className="p-2 max-h-64 overflow-y-auto space-y-1">
                            {isLoading ? (
                                <div className="p-8 flex flex-col items-center justify-center text-slate-400">
                                    <Loader2 size={24} className="animate-spin mb-3 text-orange-400" />
                                    <span className="text-sm font-medium">Searching stations...</span>
                                </div>
                            ) : suggestions.length > 0 ? (
                                suggestions.map((s, index) => (
                                    <button
                                        key={s.code}
                                        onClick={() => handleSelect(s)}
                                        className={`w-full px-4 py-3 rounded-xl flex items-center justify-between text-left transition-all group ${selectedIndex === index ? 'bg-orange-50 ring-1 ring-orange-200' : 'hover:bg-orange-50'}`}
                                        type="button"
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <div className="flex flex-col">
                                            <span className={`font-bold transition-colors ${selectedIndex === index ? 'text-orange-600' : 'text-slate-800 group-hover:text-orange-600'}`}>
                                                {highlightMatch(s.name, query)}
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedIndex === index ? 'text-orange-400' : 'text-slate-400 group-hover:text-orange-400'}`}>
                                                {highlightMatch(s.code, query)}
                                            </span>
                                        </div>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedIndex === index ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-slate-50 border border-slate-100 text-slate-300 group-hover:bg-orange-100 group-hover:text-orange-600 group-hover:border-orange-200'}`}>
                                            <MapPin size={14} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 flex flex-col items-center justify-center text-slate-400">
                                    <span className="text-sm font-medium">No stations found</span>
                                    <span className="text-xs mt-1 text-slate-400/80">Try checking the spelling</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
