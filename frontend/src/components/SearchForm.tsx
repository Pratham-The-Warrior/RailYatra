import React, { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { SearchParams } from '@/types';
import { StationSearchInput } from '@/components/StationSearchInput';

interface SearchFormProps {
    onSearch: (params: SearchParams, fromDisplay: string, toDisplay: string) => void;
    isLoading: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading }) => {
    const [params, setParams] = useState<SearchParams>({
        from: '',
        to: '',
        date: new Date().toISOString().split('T')[0],
        max_switches: 5,
        max_wait: 600,
        sort_by: 'switches',
        top_k: 10
    });

    const [fromDisplay, setFromDisplay] = useState('');
    const [toDisplay, setToDisplay] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(params, fromDisplay, toDisplay);
    };

    const handleFromChange = (code: string, display: string) => {
        setParams({ ...params, from: code });
        setFromDisplay(display);
    };

    const handleToChange = (code: string, display: string) => {
        setParams({ ...params, to: code });
        setToDisplay(display);
    };

    const handleSwap = () => {
        const tempCode = params.from;
        const tempDisplay = fromDisplay;

        setParams({
            ...params,
            from: params.to,
            to: tempCode
        });
        setFromDisplay(toDisplay);
        setToDisplay(tempDisplay);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setParams({ ...params, date: e.target.value });
    };

    return (
        <div className="w-full bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100">


            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-end gap-6 relative">
                {/* From Field */}
                <div className="flex-1 w-full space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block font-display">
                        FROM
                    </label>
                    <div className="relative">
                        <StationSearchInput
                            value={fromDisplay}
                            onChange={handleFromChange}
                            placeholder="Departure City"
                        />
                    </div>
                </div>

                {/* Swap Button */}
                <div className="relative w-full md:w-auto flex justify-center items-center h-0 md:h-auto z-20 md:-mx-3 md:mb-2">
                    <button
                        type="button"
                        onClick={handleSwap}
                        className="w-10 h-10 bg-white border border-slate-200 md:border-orange-200 rounded-full shadow-md flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-transform hover:scale-105 shrink-0 rotate-90 md:rotate-0"
                    >
                        <ArrowRightLeft size={16} />
                    </button>
                </div>

                {/* To Field */}
                <div className="flex-1 w-full space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block font-display">
                        TO
                    </label>
                    <div className="relative">
                        <StationSearchInput
                            value={toDisplay}
                            onChange={handleToChange}
                            placeholder="Arrival City"
                        />
                    </div>
                </div>

                {/* Date Field */}
                <div className="flex-1 w-full space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block font-display">
                        DATE
                    </label>
                    <div className="relative">
                        <input
                            type="date"
                            value={params.date}
                            onChange={handleDateChange}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full h-12 md:h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800 font-semibold"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full md:w-auto h-12 md:h-14 px-8 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <span className="text-lg">Search Trains</span>
                    )}
                </button>
            </form>
        </div>
    );
};
