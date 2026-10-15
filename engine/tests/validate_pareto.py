"""
Independent validator for the engine's `pareto` (trip-based) router.

For random queries it checks:
  1. VALIDITY  – every leg returned by BOTH engines (`pareto` and the classic
     `route`) exists in the raw timetable, runs on that calendar day, and every
     transfer respects 30 min <= wait <= max_wait.
  2. EXACTNESS – for 0 and 1 transfers, the pareto arrival equals a brute-force
     enumeration over all train (pairs).
  3. DOMINANCE – for every k, the best pareto arrival with <= k transfers is no
     later than any classic-engine route with <= k transfers.
  4. FRONTIER  – pareto arrivals strictly decrease as transfers increase.

Usage: python3 engine/tests/validate_pareto.py [num_queries] [seed]
Exit code is non-zero on any violation.
"""
import json, os, random, subprocess, sys, datetime
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENGINE = os.path.join(ROOT, 'engine', 'route_engine')
DATA = os.path.join(ROOT, 'master_train_data.json')
MIN_T = 30
DAYS = {'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6}


def hm(s):
    if s is None or s in ('', 'null', 'None'):
        return None
    h, m = s.split(':')[:2]
    return int(h) * 60 + int(m)


def load():
    trains = json.load(open(DATA))
    out = []
    for t in trains:
        sched = [s for s in t.get('schedule', []) if s.get('station_code')]
        if not sched:
            continue
        ops = [False] * 7
        for k, v in (t.get('operating_days') or {}).items():
            if k.lower() in DAYS:
                ops[DAYS[k.lower()]] = bool(v)
        # Timeline in minutes from 00:00 of the start day. day_of_journey in the
        # source has errors, so accumulate clock deltas instead (consecutive
        # events are always < 24h apart).
        arr, dep, clock, off = [], [], None, None
        def step(v):
            nonlocal clock, off
            off = v if off is None else off + (v - clock) % 1440
            clock = v
            return off
        for s in sched:
            a, d = hm(s.get('arrival_time')), hm(s.get('departure_time'))
            arr.append(step(a) if a is not None else None)
            dep.append(step(d) if d is not None else None)
        out.append({'number': t.get('train_number', 'UNKNOWN'), 'ops': ops,
                    'codes': [s['station_code'] for s in sched], 'arr': arr, 'dep': dep})
    return out


def runs(t, qdow, day):
    return t['ops'][(qdow + day) % 7]


def check_route(route, trains_by_num, qdow, max_wait, srcs, dsts):
    """Returns (ok, message, arrival_abs)."""
    legs = route['legs']
    if legs[0]['from_code'] not in srcs or legs[-1]['to_code'] not in dsts:
        return False, 'endpoints', None
    prev_arr, prev_train, first_dep = None, None, None
    for li, leg in enumerate(legs):
        dep_hm, arr_hm = hm(leg['departure_time']), hm(leg['arrival_time'])
        if prev_arr is None:
            dep_abs = dep_hm                         # first departure is on the query day
        else:
            if leg['from_code'] != legs[li - 1]['to_code']:
                return False, 'leg discontinuity', None
            wait = (dep_hm - prev_arr) % 1440
            if wait < MIN_T:
                wait += 1440
            if wait > max_wait:
                return False, f'wait {wait} > max_wait', None
            dep_abs = prev_arr + wait
        ok_leg = None
        for ti, t in trains_by_num.get(leg['train_number'], []):
            if ti == prev_train:
                continue
            n = len(t['codes'])
            for i in range(n):
                if t['codes'][i] != leg['from_code'] or t['dep'][i] is None:
                    continue
                if (dep_abs - t['dep'][i]) % 1440:
                    continue
                day = (dep_abs - t['dep'][i]) // 1440
                if not runs(t, qdow, day):
                    continue
                for j in range(i + 1, n):
                    if t['codes'][j] == leg['to_code'] and t['arr'][j] is not None \
                            and (day * 1440 + t['arr'][j]) % 1440 == arr_hm:
                        ok_leg = (ti, day * 1440 + t['arr'][j]); break
                if ok_leg:
                    break
            if ok_leg:
                break
        if not ok_leg:
            return False, f"leg {leg['train_number']} {leg['from_code']}->{leg['to_code']} not in timetable on that day", None
        prev_train, prev_arr = ok_leg
        if first_dep is None:
            first_dep = dep_abs
    if prev_arr - first_dep != route['total_time_min']:
        return False, f"total_time {route['total_time_min']} != {prev_arr - first_dep}", None
    return True, '', prev_arr


def brute_force(trains, srcs, dsts, qdow, max_wait):
    """Exact earliest arrival with exactly 0 and <=1 transfers."""
    INF = float('inf')
    best0 = INF
    # first legs: (station, arrival_abs, train index) reachable directly from a source
    first = []
    for ti, t in enumerate(trains):
        n = len(t['codes'])
        for i in range(n - 1):
            if t['codes'][i] not in srcs or t['dep'][i] is None:
                continue
            day = -(t['dep'][i] // 1440)
            if not runs(t, qdow, day):
                continue
            for j in range(i + 1, n):
                if t['arr'][j] is None:
                    continue
                a = day * 1440 + t['arr'][j]
                if t['codes'][j] in dsts:
                    best0 = min(best0, a)
                else:
                    first.append((t['codes'][j], a, ti))
    # second legs, indexed by boarding station
    deps = defaultdict(list)
    for ti, t in enumerate(trains):
        n = len(t['codes'])
        for i in range(n - 1):
            if t['dep'][i] is None:
                continue
            best_to_dst = min((t['arr'][j] - t['dep'][i] for j in range(i + 1, n)
                               if t['codes'][j] in dsts and t['arr'][j] is not None), default=None)
            if best_to_dst is not None:
                deps[t['codes'][i]].append((ti, t['dep'][i], best_to_dst))
    best1 = best0
    for st, a, ti in first:
        for tj, d, ride in deps.get(st, []):
            if tj == ti:
                continue
            lo = -((-(a + MIN_T - d)) // 1440)
            hi = (a + max_wait - d) // 1440
            for day in range(lo, hi + 1):
                if runs(trains[tj], qdow, day):
                    best1 = min(best1, day * 1440 + d + ride)
    return best0, best1


def main():
    nq = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    rng = random.Random(int(sys.argv[2]) if len(sys.argv) > 2 else 1)
    trains = load()
    by_num = defaultdict(list)
    for i, t in enumerate(trains):
        by_num[t['number']].append((i, t))
    cities = json.load(open(os.path.join(ROOT, 'city_stations.json')))
    counts = defaultdict(int)
    for t in trains:
        for c in t['codes']:
            counts[c] += 1
    hubs = [c for c, _ in sorted(counts.items(), key=lambda x: -x[1])[:120]]
    rare = [c for c, n in counts.items() if n <= 3]

    queries = []
    for q in range(nq):
        r = rng.random()
        if r < 0.15:
            a, b = rng.sample(list(cities), 2)
            src, dst = cities[a]['stations'], cities[b]['stations']
        else:
            pool = hubs if r < 0.75 else hubs + rare
            a, b = rng.sample(pool, 2)
            src, dst = [a], [b]
        date = (datetime.date(2026, 11, 1) + datetime.timedelta(days=rng.randrange(28))).isoformat()
        max_wait = rng.choice([180, 600, 1200])
        queries.append((src, dst, date, max_wait))

    lines = []
    for qi, (src, dst, date, mw) in enumerate(queries):
        multi = len(src) > 1 or len(dst) > 1
        lines.append(json.dumps({'request_id': f'p{qi}', 'type': 'pareto', 'from': src, 'to': dst,
                                 'date': date, 'max_switches': 3, 'max_wait': mw}))
        lines.append(json.dumps({'request_id': f'r{qi}', 'type': 'multi_route' if multi else 'route',
                                 'from': src if multi else src[0], 'to': dst if multi else dst[0],
                                 'date': date, 'max_switches': 3, 'max_wait': mw,
                                 'sort_by': 'time', 'top_k': 50}))
    proc = subprocess.run([ENGINE, DATA], input='\n'.join(lines) + '\n', capture_output=True, text=True)
    resp = {}
    for l in proc.stdout.splitlines():
        if l.startswith('{'):
            o = json.loads(l); resp[o['request_id']] = o
    times = [float(x.split(' in ')[1].split('ms')[0]) for x in proc.stderr.splitlines() if x.startswith('Pareto [')]

    failures, strictly_better, compared = [], 0, 0
    for qi, (src, dst, date, mw) in enumerate(queries):
        qdow = (datetime.date.fromisoformat(date).isoweekday()) % 7
        srcs, dsts = set(src) - set(dst), set(dst)
        tag = f'q{qi} {src[:3]}->{dst[:3]} {date} max_wait={mw}'
        par = resp[f'p{qi}'].get('results', [])
        old = resp[f'r{qi}'].get('results', [])
        par_arr = {}
        for r in par:
            ok, msg, arr = check_route(r, by_num, qdow, mw, srcs, dsts)
            if not ok:
                failures.append(f'{tag}: INVALID pareto route ({msg})')
            else:
                par_arr[r['switches']] = arr
        sw = sorted(par_arr)
        for i in range(len(sw) - 1):
            if not par_arr[sw[i + 1]] < par_arr[sw[i]]:
                failures.append(f'{tag}: frontier not strictly improving at k={sw[i+1]}')
        best_upto = lambda k: min([a for s, a in par_arr.items() if s <= k], default=float('inf'))

        b0, b1 = brute_force(trains, srcs, dsts, qdow, mw)
        if best_upto(0) != b0:
            failures.append(f'{tag}: k=0 pareto {best_upto(0)} != brute force {b0}')
        if best_upto(1) != b1:
            failures.append(f'{tag}: k<=1 pareto {best_upto(1)} != brute force {b1}')

        for r in old:
            ok, msg, arr = check_route(r, by_num, qdow, mw, srcs, dsts)
            if not ok:
                failures.append(f'{tag}: INVALID classic route ({msg})')
                continue
            compared += 1
            bp = best_upto(r['switches'])
            if bp > arr:
                failures.append(f"{tag}: classic route with {r['switches']} switches arrives {arr} < pareto {bp}")
            elif bp < arr:
                strictly_better += 1

    print(f'queries: {nq}, pareto routes: {sum(len(resp[f"p{i}"].get("results", [])) for i in range(nq))}, '
          f'classic routes compared: {compared}, pareto strictly earlier than classic route: {strictly_better}')
    if times:
        times.sort()
        print(f'pareto engine ms: mean {sum(times)/len(times):.2f} p50 {times[len(times)//2]:.2f} '
              f'p99 {times[min(len(times)-1, int(len(times)*0.99))]:.2f} max {times[-1]:.2f}')
    if failures:
        print(f'FAILURES ({len(failures)}):')
        for f in failures[:40]:
            print('  ' + f)
        sys.exit(1)
    print('ALL CHECKS PASSED')


if __name__ == '__main__':
    main()
