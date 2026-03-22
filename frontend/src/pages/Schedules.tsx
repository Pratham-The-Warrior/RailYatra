import React, { useState, useRef } from 'react';

import { SchedulesError } from '../components/Schedules/SchedulesError';
import { SchedulesLanding } from '../components/Schedules/SchedulesLanding';
import { SchedulesResult } from '../components/Schedules/SchedulesResult';

/* ─── Types ──────────────────────────────────────────────────────────── */
export interface ScheduleItem {
    arrival_time: string | null;
    departure_time: string | null;
    day_of_journey: number;
    distance_km: number;
    station_code: string;
    station_name: string;
    sequence_number: number;
}

export interface TrainSchedule {
    train_number: string;
    train_name: string;
    type: string;
    classes_available: string[];
    operating_days: Record<string, boolean>;
    schedule: ScheduleItem[];
    hasPdf: boolean;
    pdfUrl: string | null;
}

export interface RecentSearch {
    trainNumber: string;
    trainName: string;
    timestamp: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
const RECENT_KEY = 'railyatra_recent_schedules';

export const computeHalt = (arrival: string | null, departure: string | null): string => {
    if (!arrival || !departure) return '--';
    const [ah, am] = arrival.split(':').map(Number);
    const [dh, dm] = departure.split(':').map(Number);
    let diff = (dh * 60 + dm) - (ah * 60 + am);
    if (diff < 0) diff += 24 * 60;
    return `${diff} min`;
};

export const titleCase = (s: string): string =>
    s.toLowerCase().split(' ')
        .map(w => w.length <= 2 && w !== 'jn' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .replace(/\bJn\.\b/gi, 'Jn')
        .replace(/\bJn\b/gi, 'Jn');

const loadRecents = (): RecentSearch[] => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};

const saveRecent = (trainNumber: string, trainName: string) => {
    let recents = loadRecents().filter(r => r.trainNumber !== trainNumber);
    recents.unshift({ trainNumber, trainName, timestamp: Date.now() });
    if (recents.length > 5) recents = recents.slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
};

/* ─── Popular trains data moved to SchedulesLanding ──────────────────── */

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                        */
/* ═══════════════════════════════════════════════════════════════════════ */
interface SchedulesProps {
    onNavigate?: (page: 'home' | 'schedules' | 'category-routes') => void;
    initialTrainNumber?: string | null;
}

export const Schedules: React.FC<SchedulesProps> = ({ onNavigate, initialTrainNumber }) => {
    const [trainNumber, setTrainNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState<TrainSchedule | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recents, setRecents] = useState<RecentSearch[]>(loadRecents());
    const initialFetchDone = useRef(false);

    const resultsRef = useRef<HTMLDivElement>(null);

    /* ── fetch ── */
    const fetchSchedule = async (num: string) => {
        if (!num.trim()) return;
        setLoading(true);
        setError(null);
        setSchedule(null);


        try {
            let res: Response;
            try {
                res = await fetch(`/api/schedule/${num.trim()}`);
            } catch {
                throw new Error('Unable to connect to the server. Sorry for the inconvenience.');
            }

            if (!res.ok) throw new Error(res.status === 404
                ? 'Train not found. Please check the number and try again.'
                : 'Something went wrong. Please try again.'
            );

            let data: TrainSchedule;
            try {
                data = await res.json();
            } catch {
                throw new Error('Unable to connect to the server. Sorry for the inconvenience.');
            }

            setSchedule(data);
            saveRecent(data.train_number, data.train_name);
            setRecents(loadRecents());
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    /* ── initial fetch ── */
    React.useEffect(() => {
        if (initialTrainNumber && !initialFetchDone.current) {
            setTrainNumber(initialTrainNumber);
            fetchSchedule(initialTrainNumber);
            initialFetchDone.current = true;
        }
    }, [initialTrainNumber]);

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); fetchSchedule(trainNumber); };
    const handleBack = () => { setSchedule(null); setError(null); };

/* ── derived (moved to SchedulesResult) ── */

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  NOT FOUND / ERROR VIEW                                             */
    /* ═══════════════════════════════════════════════════════════════════ */
    if (error && !schedule && !loading) {
        return <SchedulesError error={error} setError={setError} />;
    }

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  SEARCH/LANDING VIEW                                                */
    /* ═══════════════════════════════════════════════════════════════════ */
    if (!schedule && !loading) {
        return (
            <SchedulesLanding
                trainNumber={trainNumber}
                setTrainNumber={setTrainNumber}
                fetchSchedule={fetchSchedule}
                handleSubmit={handleSubmit}
                recents={recents}
                onNavigate={onNavigate}
            />
        );
    }

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  LOADING STATE                                                      */
    /* ═══════════════════════════════════════════════════════════════════ */
    if (loading) {
        return (
            <div className="min-h-screen pt-20 md:pt-24 pb-12 md:pb-20 bg-[#f5f6f8] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-14 h-14 mx-auto rounded-full border-[3px] border-orange-100 border-t-orange-500 animate-spin mb-5" />
                    <p className="text-slate-500 font-medium text-sm">Loading schedule for {trainNumber}…</p>
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════════════════ */
    /*  RESULTS VIEW                                                       */
    /* ═══════════════════════════════════════════════════════════════════ */
    return (
        <SchedulesResult
            schedule={schedule!}
            trainNumber={trainNumber}
            setTrainNumber={setTrainNumber}
            handleSubmit={handleSubmit}
            handleBack={handleBack}
            resultsRef={resultsRef}
        />
    );
};