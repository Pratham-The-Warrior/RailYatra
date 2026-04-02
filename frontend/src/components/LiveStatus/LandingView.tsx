import { SearchHero } from './SearchHero';
import { LandingDashboard } from './LandingDashboard';
import { BackButton } from '../Common/BackButton';

interface LandingViewProps {
    trainNumber: string;
    setTrainNumber: (val: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onTrack: (num: string) => void;
    onNavigate?: (page: 'home' | 'schedules' | 'live-status' | 'category-routes') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
    trainNumber, setTrainNumber, onSubmit, onTrack, onNavigate
}) => {
    return (
        <div className="min-h-screen pb-10 md:pb-20 bg-white relative overflow-x-hidden font-sans">
            {onNavigate && (
                <div className="absolute top-20 md:top-24 left-0 w-full z-20 pointer-events-none">
                    <div className="max-w-[1120px] mx-auto px-4 md:px-5 flex justify-start">
                        <BackButton onClick={() => onNavigate('home')} label="Back to Home" className="pointer-events-auto" />
                    </div>
                </div>
            )}

            <div className="relative max-w-[1120px] mx-auto px-4 md:px-5 pt-28 md:pt-32 pb-10 md:pb-16 z-10 text-center">
                {/* Live Network Status Indicator */}
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded-md mb-4 sm:mb-6 tracking-[0.15em] uppercase border border-emerald-100/50 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    REAL-TIME TRAIN TRACKING
                </div>

                <SearchHero
                    trainNumber={trainNumber}
                    setTrainNumber={setTrainNumber}
                    onSubmit={onSubmit}
                    onTrack={onTrack}
                />

                <LandingDashboard
                    onTrack={onTrack}
                />
            </div>
        </div>
    );
};
