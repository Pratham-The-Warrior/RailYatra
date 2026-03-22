interface RouteStep {
    from_name: string;
    from_code: string;
    to_name: string;
    to_code: string;
    train_number: string;
    train_name: string;
    train_type: string;
    departure_time: string;
    arrival_time: string;
    distance_km: number;
    travel_time_min: number;
    classes: string[];
}

export interface Route {
    total_distance_km: number;
    total_time_min: number;
    total_time_formatted: string;
    switches: number;
    legs: RouteStep[];
}

export interface SearchParams {
    from: string;
    to: string;
    date: string;
    max_switches: number;
    max_wait: number;
    sort_by: 'time' | 'distance' | 'switches';
    top_k: number;
}

export interface Station {
    code: string;
    name: string;
}
