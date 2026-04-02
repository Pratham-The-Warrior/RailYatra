import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
    onClick: () => void;
    label?: string;
    className?: string;
    sticky?: boolean;
    offset?: number; // top offset for sticky
}

export const BackButton: React.FC<BackButtonProps> = ({
    onClick,
    label = 'Back',
    className = '',
    sticky = false,
    offset = 64 // default h-16 or as per project
}) => {
    const [isScrolled, setIsScrolled] = React.useState(false);

    React.useEffect(() => {
        if (!sticky) return;
        
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [sticky]);

    const stickyClasses = sticky 
        ? `sticky z-30 transition-all duration-300 ${isScrolled ? `bg-[#f5f6f8]/95 backdrop-blur-md shadow-sm border-b border-slate-200/50 py-2.5 px-1 -mx-1` : 'bg-transparent border-b border-transparent py-2.5 md:py-0'}`
        : '';

    return (
        <div className={`${stickyClasses} ${className}`} style={sticky ? { top: `${offset}px` } : {}}>
            <button
                onClick={onClick}
                className="group flex items-center gap-1 py-1.5 pr-3.5 pl-1.5 rounded-full bg-white border border-slate-200 shadow-sm hover:border-orange-200 hover:bg-orange-50/50 transition-all active:scale-[0.96]"
            >
                <div className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                    <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-orange-600" />
                </div>
                <span className="text-[13px] font-bold text-slate-600 group-hover:text-orange-600 transition-colors">{label}</span>
            </button>
        </div>
    );
};
