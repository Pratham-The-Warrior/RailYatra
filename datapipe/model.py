"""Canonical train record helpers (the format master_train_data.json uses)."""
import re

DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
_TIME = re.compile(r'^(\d{1,2}):(\d{2})(?::\d{2})?$')
STATION_CODE = re.compile(r'^[A-Z0-9]{1,8}$')


def parse_clock(value, allow_overflow=False):
    """
    'HH:MM' (or 'HH:MM:SS') -> minutes since midnight, or None if invalid.
    Canonical data requires 00:00-23:59; GTFS allows hours past 23 for
    trips running after midnight (allow_overflow=True).
    """
    if value is None:
        return None
    m = _TIME.match(str(value).strip())
    if not m:
        return None
    h, mi = int(m.group(1)), int(m.group(2))
    if mi > 59 or (h > 23 and not allow_overflow):
        return None
    return h * 60 + mi


def fmt_clock(minutes):
    minutes %= 1440
    return f'{minutes // 60:02d}:{minutes % 60:02d}'


def new_train(number, name, type_, classes, operating_days, schedule, route_id=None):
    """Builds a canonical record. schedule: list of stop dicts (see new_stop)."""
    return {
        'classes_available': list(classes),
        'operating_days': {d: bool(operating_days.get(d, False)) for d in DAYS},
        'route_id': route_id or (f"{number}-{schedule[0]['station_code']}-{schedule[-1]['station_code']}" if schedule else number),
        'schedule': schedule,
        'train_name': name,
        'train_number': number,
        'type': type_,
    }


def new_stop(seq, code, name, arrival, departure, day, distance_km, platform=None):
    return {
        'arrival_time': arrival,
        'day_of_journey': day,
        'departure_time': departure,
        'distance_km': distance_km,
        'platform': platform,
        'sequence_number': seq,
        'station_code': code,
        'station_name': name,
    }
