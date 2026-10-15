"""
Validation and repair of canonical train records.

Errors reject a train (it is left out of the published data); warnings are
recorded and, where safe, repaired in place. Every finding names the train so
the report can point at it.
"""
from collections import Counter, defaultdict
from .model import DAYS, STATION_CODE, parse_clock


def _derive_days(schedule):
    """
    Recomputes day_of_journey from clock times. Consecutive timetable events are
    always < 24 h apart, so each backwards step in clock time is one midnight.
    (Same rule as the engine's ingestion; see engine/graph.cpp.)
    Returns a list of derived days (per stop: day of arrival, or of departure at
    the origin).
    """
    day, last, out = 1, None, []
    for stop in schedule:
        arr, dep = parse_clock(stop.get('arrival_time')), parse_clock(stop.get('departure_time'))
        stop_day = None
        for clock in (arr, dep):
            if clock is None:
                continue
            if last is not None and clock < last:
                day += 1
            last = clock
            if stop_day is None:
                stop_day = day
        out.append(stop_day if stop_day is not None else day)
    return out


def _is_real_code(code):
    """Station codes are letters (sometimes with digits); a numbers-only code is corrupt."""
    return bool(code) and code.isalnum() and code == code.upper() and any(ch.isalpha() for ch in code)


def build_name_index(trains):
    """station_name -> set of real codes used for it across all trains."""
    index = defaultdict(set)
    for t in trains:
        for s in t.get('schedule') or []:
            code, name = s.get('station_code') or '', s.get('station_name')
            if name and _is_real_code(code):
                index[name.strip().upper()].add(code)
    return index


def validate_train(t, name_index=None):
    """Returns (errors, warnings). Repairs day_of_journey and corrupt codes in place."""
    errors, warnings = [], []
    num = str(t.get('train_number') or '').strip()
    if not num:
        return ['missing train_number'], []
    sched = t.get('schedule') or []
    if len(sched) < 2:
        errors.append('fewer than 2 stops')
        return errors, warnings

    for i, s in enumerate(sched):
        code = s.get('station_code') or ''
        if code.isdigit() and name_index is not None:
            # Seen in the source data: one-letter codes (R, G, J) replaced by an
            # hour value ("08"). Repair only when the name maps to exactly one code.
            candidates = name_index.get((s.get('station_name') or '').strip().upper(), set())
            if len(candidates) == 1:
                fixed = next(iter(candidates))
                warnings.append(f"stop {i + 1}: corrupt station code {code!r} for {s.get('station_name')!r} -> {fixed!r} (repaired by name)")
                s['station_code'] = code = fixed
        if not _is_real_code(code):
            errors.append(f'stop {i + 1}: invalid station code {code!r}')
        elif not STATION_CODE.match(code):
            # Looks like a station name used as a code; keep the train (other
            # stops are fine) but flag it for correction at the source.
            warnings.append(f'stop {i + 1}: unusual station code {code!r} (longer than 8 characters)')
        if not isinstance(s.get('distance_km'), (int, float)) or isinstance(s.get('distance_km'), bool):
            errors.append(f'stop {i + 1} ({code}): missing distance_km (the engine needs real distances)')
        for key in ('arrival_time', 'departure_time'):
            v = s.get(key)
            if v is not None and parse_clock(v) is None:
                errors.append(f'stop {i + 1} ({code}): unparseable {key} {v!r}')
    if parse_clock(sched[0].get('departure_time')) is None:
        errors.append('origin has no departure time')
    if parse_clock(sched[-1].get('arrival_time')) is None:
        errors.append('terminus has no arrival time')

    ops = t.get('operating_days') or {}
    if not any(ops.get(d) for d in DAYS):
        errors.append('runs on no day of the week')
    if errors:
        return errors, warnings

    for i in range(1, len(sched)):
        if sched[i]['station_code'] == sched[i - 1]['station_code']:
            warnings.append(f"stop {i + 1}: same station twice in a row ({sched[i]['station_code']})")
        d0, d1 = sched[i - 1].get('distance_km'), sched[i].get('distance_km')
        if isinstance(d0, (int, float)) and isinstance(d1, (int, float)) and d1 < d0:
            warnings.append(f"stop {i + 1} ({sched[i]['station_code']}): distance decreases {d0} -> {d1}")

    for i, (stop, day) in enumerate(zip(sched, _derive_days(sched))):
        if stop.get('day_of_journey') != day:
            warnings.append(f"stop {i + 1} ({stop['station_code']}): day_of_journey {stop.get('day_of_journey')} -> {day} (repaired from clock times)")
            stop['day_of_journey'] = day
    return errors, warnings


def validate_all(trains):
    """
    Validates every train. Returns (accepted, rejected, warnings, station_names).
    rejected: {train_number: [errors]}; warnings: {train_number: [warnings]}.
    station_names: code -> most common name across all trains.
    """
    accepted, rejected, warnings = [], {}, {}
    seen = set()
    name_index = build_name_index(trains)
    for t in trains:
        errs, warns = validate_train(t, name_index)
        num = str(t.get('train_number') or '?')
        if num in seen:
            errs = errs + ['duplicate train_number (first occurrence kept)']
        if errs:
            rejected[num] = errs
            continue
        seen.add(num)
        if warns:
            warnings[num] = warns
        accepted.append(t)

    names = defaultdict(Counter)
    for t in accepted:
        for s in t['schedule']:
            if s.get('station_name'):
                names[s['station_code']][s['station_name']] += 1
    station_names = {code: c.most_common(1)[0][0] for code, c in names.items()}
    for code, c in names.items():
        if len(c) > 1:
            warnings.setdefault(f'station {code}', []).append(
                'inconsistent names: ' + ', '.join(f'{n!r} x{k}' for n, k in c.most_common()))
    return accepted, rejected, warnings, station_names
