"""
Protocol equivalence test between two engine binaries.

Sends the same request stream (every request type, every error path, malformed
input) to both binaries and requires identical stdout responses, ignoring only
the timing field `elapsed_ms`. Use it to prove a refactor changes no behaviour:

  python3 engine/tests/golden_protocol.py <reference_binary> <candidate_binary> [n_random]
"""
import json
import os
import random
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'master_train_data.json')

STATIONS = ['NDLS', 'CSMT', 'KOP', 'HWH', 'BSL', 'ET', 'BZA', 'R', 'G', 'PUNE', 'MAS', 'SBC', 'LKO', 'DIB']
CITY = json.load(open(os.path.join(ROOT, 'city_stations.json')))


def requests(n_random, seed=11):
    rng = random.Random(seed)
    fixed = [
        # malformed / envelope edge cases
        'not json at all',
        '{"request_id": 5, "from": "NDLS", "to": "CSMT", "date": "2026-10-20"}',   # non-string id
        '{"from": "NDLS", "to": "CSMT", "date": "2026-10-20"}',                     # no id
        '{"request_id": "t1", "type": "no_such_type", "from": "NDLS", "to": "CSMT", "date": "2026-10-20"}',
        # route errors
        '{"request_id": "e1", "from": "NDLS", "to": "ndls", "date": "2026-10-20"}',
        '{"request_id": "e2", "from": "XXXX", "to": "CSMT", "date": "2026-10-20"}',
        '{"request_id": "e3", "from": "NDLS", "to": "YYYY", "date": "2026-10-20"}',
        '{"request_id": "e4", "from": "NDLS", "date": "2026-10-20"}',
        '{"request_id": "e5", "from": 7, "to": "CSMT", "date": "2026-10-20"}',
        '{"request_id": "e6", "from": "NDLS", "to": "CSMT", "date": "2026-10-20", "sort_by": 3}',
        # schedule
        '{"request_id": "s1", "type": "schedule", "train_number": "12138"}',
        '{"request_id": "s2", "type": "schedule", "train_number": "99999"}',
        '{"request_id": "s3", "type": "schedule"}',
        '{"request_id": "s4", "type": "schedule", "train_number": 12138}',
        # pareto errors and edge cases
        '{"request_id": "p1", "type": "pareto", "from": ["NDLS"], "to": ["NDLS"], "date": "2026-10-20"}',
        '{"request_id": "p2", "type": "pareto", "from": ["XXXX"], "to": ["CSMT"], "date": "2026-10-20"}',
        '{"request_id": "p3", "type": "pareto", "from": ["NDLS"], "to": ["ZZZZ"], "date": "2026-10-20"}',
        '{"request_id": "p4", "type": "pareto", "from": "ndls", "to": "csmt", "date": "2026-10-20"}',
        '{"request_id": "p5", "type": "pareto", "from": ["NDLS"], "date": "2026-10-20"}',
        '{"request_id": "p6", "type": "pareto", "from": [], "to": ["CSMT"], "date": "2026-10-20"}',
        '{"request_id": "p7", "type": "pareto", "from": ["NDLS"], "to": ["CSMT"], "date": "2026-10-20", "max_wait": 10}',
        # multi_route errors
        '{"request_id": "m1", "type": "multi_route", "from": ["NDLS"], "date": "2026-10-20"}',
        '{"request_id": "m2", "type": "multi_route", "from": ["XXXX"], "to": ["YYYY"], "date": "2026-10-20"}',
    ]
    out = list(fixed)
    for i in range(n_random):
        kind = rng.choice(['route', 'route', 'multi_route', 'pareto', 'schedule'])
        date = f'2026-11-{rng.randint(1, 28):02d}'
        if kind == 'schedule':
            out.append(json.dumps({'request_id': f'r{i}', 'type': 'schedule', 'train_number': rng.choice(['12138', '12809', '11466', '20825'])}))
            continue
        if kind == 'multi_route' or (kind == 'pareto' and rng.random() < 0.4):
            a, b = rng.sample(list(CITY), 2)
            frm, to = CITY[a]['stations'], CITY[b]['stations']
        else:
            frm, to = rng.sample(STATIONS, 2)
            if kind == 'pareto':
                frm, to = [frm], [to]
        req = {'request_id': f'r{i}', 'type': kind, 'from': frm, 'to': to, 'date': date,
               'max_switches': rng.randint(0, 4), 'max_wait': rng.choice([120, 600, 1200])}
        if kind != 'pareto':
            req['top_k'] = rng.choice([1, 10, 50])
            req['sort_by'] = rng.choice(['time', 'distance', 'switches', 'bogus'])
        out.append(json.dumps(req))
    return out


def run(binary, lines):
    p = subprocess.run([binary, DATA], input='\n'.join(lines) + '\n', capture_output=True, text=True, timeout=600)
    outs = []
    for line in p.stdout.splitlines():
        o = json.loads(line)
        o.pop('elapsed_ms', None)
        outs.append(json.dumps(o, sort_keys=True))
    return outs


def main():
    ref, cand = sys.argv[1], sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    lines = requests(n)
    a, b = run(ref, lines), run(cand, lines)
    if len(a) != len(lines) or len(b) != len(lines):
        print(f'FAIL: expected {len(lines)} responses, got {len(a)} (reference) and {len(b)} (candidate)')
        sys.exit(1)
    diffs = [i for i in range(len(lines)) if a[i] != b[i]]
    errors = sum(1 for x in a if '"error"' in x)
    print(f'{len(lines)} requests ({errors} error responses): {len(diffs)} differences')
    for i in diffs[:5]:
        print('REQUEST  ', lines[i][:200]); print('REFERENCE', a[i][:300]); print('CANDIDATE', b[i][:300])
    sys.exit(1 if diffs else 0)


if __name__ == '__main__':
    main()
