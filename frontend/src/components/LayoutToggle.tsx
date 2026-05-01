import React from 'react';
import { LayoutList, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

export type ViewLayout = 'list' | 'carousel';

interface LayoutToggleProps {
    layout: ViewLayout;
    onToggle: (layout: ViewLayout) => void;
}

export const LayoutToggle: React.FC<LayoutToggleProps> = ({ layout, onToggle }) => {
    return (
        <div className="relative flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
            {/* Sliding active indicator */}
            <motion.div
                className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm border border-slate-200"
                initial={false}
                animate={{
                    left: layout === 'list' ? '4px' : '50%',
                    width: 'calc(50% - 6px)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />

            <button
                onClick={() => onToggle('list')}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${layout === 'list' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                    }`}
                aria-label="List view"
                id="layout-toggle-list"
            >
                <LayoutList size={14} />
                <span className="hidden sm:inline">List</span>
            </button>

            <button
                onClick={() => onToggle('carousel')}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${layout === 'carousel' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                    }`}
                aria-label="Card view"
                id="layout-toggle-carousel"
            >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Cards</span>
            </button>
        </div>
    );
};
