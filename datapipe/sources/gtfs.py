"""
Source: a GTFS static feed (zip), the global standard for transit timetables.

Config:
  {"adapter": "gtfs", "url": "https://..." | "path": "local/feed.zip",
   "distance_unit": "km" | "m",        # unit of stop_times.shape_dist_traveled
   "default_type": "EXPRESS",
   "robots": "respect" | "agreement"}   # "agreement" only for licensed endpoints

Mapping:
  one GTFS trip -> one train; train_number = trip_short_name, else
  route_short_name; name = route_long_name; operating days from calendar.txt
  (calendar_dates.txt exceptions are not modelled: RailYatra routes by weekday).
  GTFS times may exceed 24:00:00; the overflow becomes day_of_journey.
  Distances come from shape_dist_traveled when present; otherwise the stop is
  given distance_km = None and the gap is reported (never invented).
"""
import csv
import io
import os
import zipfile

from ..model import DAYS, fmt_clock, new_stop, new_train, parse_clock


def _rows(z, name):
    if name not in z.namelist():
        return []
    with z.open(name) as f:
        return list(csv.DictReader(io.TextIOWrapper(f, encoding='utf-8-sig')))


def load(cfg, ctx):
    if 'path' in cfg:
        with open(os.path.join(ctx['root'], cfg['path']), 'rb') as f:
            blob = f.read()
    else:
        blob = ctx['fetcher'].get(cfg['url'], robots=cfg.get('robots', 'respect'))
    return parse(blob, cfg)


def parse(blob, cfg):
    z = zipfile.ZipFile(io.BytesIO(blob))
    stops = {r['stop_id']: r for r in _rows(z, 'stops.txt')}
    routes = {r['route_id']: r for r in _rows(z, 'routes.txt')}
    calendar = {r['service_id']: r for r in _rows(z, 'calendar.txt')}
    trips = {r['trip_id']: r for r in _rows(z, 'trips.txt')}
    unit = cfg.get('distance_unit', 'km')
    scale = 0.001 if unit == 'm' else 1.0

    times = {}
    for r in _rows(z, 'stop_times.txt'):
        times.setdefault(r['trip_id'], []).append(r)

    trains = []
    for trip_id, st in times.items():
        trip = trips.get(trip_id)
        if not trip:
            continue
        route = routes.get(trip.get('route_id'), {})
        number = (trip.get('trip_short_name') or route.get('route_short_name') or trip_id).strip()
        name = (route.get('route_long_name') or trip.get('trip_headsign') or number).strip()
        cal = calendar.get(trip.get('service_id'), {})
        ops = {d: cal.get(d) == '1' for d in DAYS}

        st.sort(key=lambda r: int(r['stop_sequence']))
        schedule = []
        for i, r in enumerate(st):
            stop = stops.get(r['stop_id'], {})
            code = (stop.get('stop_code') or r['stop_id']).strip().upper()
            arr = parse_clock(r.get('arrival_time'), allow_overflow=True)
            dep = parse_clock(r.get('departure_time'), allow_overflow=True)
            first, last = i == 0, i == len(st) - 1
            day_src = arr if arr is not None else dep
            dist_raw = r.get('shape_dist_traveled')
            dist = round(float(dist_raw) * scale) if dist_raw not in (None, '') else None
            schedule.append(new_stop(
                seq=i + 1, code=code, name=(stop.get('stop_name') or code).strip().upper(),
                arrival=None if first or arr is None else fmt_clock(arr),
                departure=None if last or dep is None else fmt_clock(dep),
                day=(day_src // 1440) + 1 if day_src is not None else 1,
                distance_km=dist))
        trains.append(new_train(number, name, route.get('route_desc') or cfg.get('default_type', 'EXPRESS'),
                                [], ops, schedule))
    return trains
