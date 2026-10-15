"""Run: python3 -m unittest discover -s datapipe/tests -t ."""
import copy
import io
import json
import os
import tempfile
import unittest
import urllib.error
import zipfile
from email.message import Message

from datapipe import pipeline
from datapipe.fetch import FetchError, PoliteFetcher
from datapipe.model import DAYS, new_stop, new_train
from datapipe.sources import gtfs
from datapipe.validate import validate_all, validate_train

ALL_DAYS = {d: True for d in DAYS}


def train(num, stops, days=ALL_DAYS, type_='EXPRESS'):
    sched = [new_stop(i + 1, c, n, a, d, day, km) for i, (c, n, a, d, day, km) in enumerate(stops)]
    return new_train(num, f'TRAIN {num}', type_, ['SL'], days, sched)


GOOD = [('AAA', 'ALPHA', None, '22:00', 1, 0), ('BBB', 'BRAVO', '23:30', '23:35', 1, 100),
        ('CCC', 'CHARLIE', '01:10', None, 2, 200)]


class ValidateTests(unittest.TestCase):
    def test_good_train_passes(self):
        errs, warns = validate_train(train('12345', GOOD))
        self.assertEqual(errs, [])
        self.assertEqual(warns, [])

    def test_wrong_day_is_repaired_from_clock_times(self):
        stops = copy.deepcopy(GOOD)
        stops[1] = ('BBB', 'BRAVO', '23:30', '23:35', 2, 100)   # should be day 1
        t = train('1', stops)
        errs, warns = validate_train(t)
        self.assertEqual(errs, [])
        self.assertEqual(t['schedule'][1]['day_of_journey'], 1)
        self.assertTrue(any('repaired' in w for w in warns))

    def test_numeric_code_repaired_by_unique_name(self):
        ref = train('1', [('RRR', 'RAIPUR JN', None, '08:00', 1, 0), ('BBB', 'BRAVO', '09:00', None, 1, 50)])
        bad = train('2', [('08', 'RAIPUR JN', None, '08:05', 1, 0), ('BBB', 'BRAVO', '09:10', None, 1, 50)])
        accepted, rejected, warnings, _ = validate_all([ref, bad])
        self.assertEqual(rejected, {})
        self.assertEqual(bad['schedule'][0]['station_code'], 'RRR')
        self.assertTrue(any('corrupt station code' in w for w in warnings['2']))

    def test_numeric_code_with_ambiguous_name_is_rejected(self):
        a = train('1', [('XA', 'SAMENAME', None, '08:00', 1, 0), ('BBB', 'BRAVO', '09:00', None, 1, 50)])
        b = train('2', [('XB', 'SAMENAME', None, '08:00', 1, 0), ('BBB', 'BRAVO', '09:00', None, 1, 50)])
        c = train('3', [('08', 'SAMENAME', None, '08:00', 1, 0), ('BBB', 'BRAVO', '09:00', None, 1, 50)])
        _, rejected, _, _ = validate_all([a, b, c])
        self.assertIn('3', rejected)

    def test_hard_errors_reject(self):
        no_days = train('1', GOOD, days={d: False for d in DAYS})
        no_dist = train('2', [('AAA', 'A', None, '10:00', 1, None), ('BBB', 'B', '11:00', None, 1, 5)])
        one_stop = train('3', GOOD[:1])
        bad_time = train('4', [('AAA', 'A', None, '25:99', 1, 0), ('BBB', 'B', '11:00', None, 1, 5)])
        _, rejected, _, _ = validate_all([no_days, no_dist, one_stop, bad_time])
        self.assertEqual(set(rejected), {'1', '2', '3', '4'})

    def test_long_code_is_a_warning_not_a_rejection(self):
        t = train('1', [('KARAMNASA', 'KARAMNASA', None, '10:00', 1, 0), ('BBB', 'B', '11:00', None, 1, 5)])
        errs, warns = validate_train(t)
        self.assertEqual(errs, [])
        self.assertTrue(any('unusual station code' in w for w in warns))

    def test_duplicate_train_number_keeps_first(self):
        accepted, rejected, _, _ = validate_all([train('9', GOOD), train('9', GOOD)])
        self.assertEqual(len(accepted), 1)
        self.assertIn('9', rejected)


def make_gtfs(dist_col=True):
    files = {
        'stops.txt': 'stop_id,stop_code,stop_name\ns1,NDLS,New Delhi\ns2,AGC,Agra Cantt\ns3,BPL,Bhopal Jn\n',
        'routes.txt': 'route_id,route_short_name,route_long_name,route_desc\nr1,12002,Bhopal Shatabdi,SHATABDI\n',
        'calendar.txt': 'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n'
                        'c1,1,1,1,1,1,1,0,20260101,20261231\n',
        'trips.txt': 'route_id,service_id,trip_id,trip_short_name\nr1,c1,t1,12002\n',
        'stop_times.txt': ('trip_id,arrival_time,departure_time,stop_id,stop_sequence' + (',shape_dist_traveled' if dist_col else '') + '\n'
                           f"t1,22:00:00,22:00:00,s1,1{',0' if dist_col else ''}\n"
                           f"t1,23:55:00,24:05:00,s2,2{',195000' if dist_col else ''}\n"
                           f"t1,28:30:00,28:30:00,s3,3{',705000' if dist_col else ''}\n"),
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        for name, text in files.items():
            z.writestr(name, text)
    return buf.getvalue()


class GtfsTests(unittest.TestCase):
    def test_gtfs_maps_to_valid_canonical_train(self):
        [t] = gtfs.parse(make_gtfs(), {'distance_unit': 'm'})
        self.assertEqual(t['train_number'], '12002')
        self.assertEqual(t['type'], 'SHATABDI')
        self.assertFalse(t['operating_days']['sunday'])
        self.assertTrue(t['operating_days']['monday'])
        s = t['schedule']
        self.assertEqual([x['station_code'] for x in s], ['NDLS', 'AGC', 'BPL'])
        self.assertIsNone(s[0]['arrival_time'])
        self.assertIsNone(s[-1]['departure_time'])
        self.assertEqual(s[1]['departure_time'], '00:05')     # 24:05:00 wraps past midnight
        self.assertEqual(s[2]['arrival_time'], '04:30')
        self.assertEqual(s[2]['day_of_journey'], 2)
        self.assertEqual([x['distance_km'] for x in s], [0, 195, 705])
        errs, _ = validate_train(t)
        self.assertEqual(errs, [])

    def test_gtfs_without_distances_is_rejected_not_invented(self):
        [t] = gtfs.parse(make_gtfs(dist_col=False), {})
        errs, _ = validate_train(t)
        self.assertTrue(any('missing distance_km' in e for e in errs))


class FakeResponse(io.BytesIO):
    def __init__(self, body, headers=None):
        super().__init__(body)
        self.headers = headers or {}

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def http_error(url, code, headers=None):
    msg = Message()
    for k, v in (headers or {}).items():
        msg[k] = v
    return urllib.error.HTTPError(url, code, 'err', msg, None)


class FetchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.sleeps = []

    def fetcher(self, script):
        calls = []

        def opener(req, timeout=None):
            calls.append(req)
            step = script(req, len(calls))
            if isinstance(step, Exception):
                raise step
            return step
        f = PoliteFetcher('TestBot/1.0 (ops@example.com)', self.tmp, min_interval_s=0,
                          sleep=self.sleeps.append, opener=opener)
        return f, calls

    def test_user_agent_must_identify_us(self):
        with self.assertRaises(ValueError):
            PoliteFetcher('Mozilla/5.0', self.tmp)

    def test_robots_disallow_is_respected(self):
        def script(req, n):
            return FakeResponse(b'User-agent: *\nDisallow: /private\n')
        f, _ = self.fetcher(script)
        with self.assertRaises(FetchError):
            f.get('https://x.test/private/feed.zip')

    def test_retry_after_on_429_then_success_and_identifying_ua(self):
        def script(req, n):
            if req.full_url.endswith('robots.txt'):
                return FakeResponse(b'')
            if n == 2:
                return http_error(req.full_url, 429, {'Retry-After': '7'})
            return FakeResponse(b'DATA', {'ETag': '"v1"'})
        f, calls = self.fetcher(script)
        self.assertEqual(f.get('https://x.test/feed.zip'), b'DATA')
        self.assertIn(7.0, self.sleeps)
        self.assertTrue(all('ops@example.com' in c.get_header('User-agent') for c in calls))

    def test_304_serves_cached_body_and_sends_etag(self):
        def script(req, n):
            if req.full_url.endswith('robots.txt'):
                return FakeResponse(b'')
            if req.get_header('If-none-match') == '"v1"':
                return http_error(req.full_url, 304)
            return FakeResponse(b'DATA', {'ETag': '"v1"'})
        f, calls = self.fetcher(script)
        self.assertEqual(f.get('https://x.test/feed.zip'), b'DATA')
        self.assertEqual(f.get('https://x.test/feed.zip'), b'DATA')
        self.assertEqual(calls[-1].get_header('If-none-match'), '"v1"')

    def test_gives_up_after_max_retries(self):
        def script(req, n):
            if req.full_url.endswith('robots.txt'):
                return FakeResponse(b'')
            return http_error(req.full_url, 503)
        f, _ = self.fetcher(script)
        f.max_retries = 2
        with self.assertRaises(FetchError):
            f.get('https://x.test/feed.zip')


class PipelineTests(unittest.TestCase):
    def test_merge_priority_first_source_wins(self):
        hi, lo = train('1', GOOD), train('1', GOOD)
        hi['train_name'] = 'HIGH'
        trains, prov = pipeline.merge([('licensed', [hi]), ('legacy', [lo, train('2', GOOD)])])
        self.assertEqual({t['train_number']: t['train_name'] for t in trains}['1'], 'HIGH')
        self.assertEqual(prov, {'1': 'licensed', '2': 'legacy'})

    def test_gate_blocks_large_removals(self):
        old = [train(str(i), GOOD) for i in range(100)]
        cfg = {'publish_gate': {'min_trains': 10, 'max_removed_pct': 5}}
        self.assertEqual(pipeline.gate(old, old[:96], cfg), [])
        self.assertTrue(pipeline.gate(old, old[:90], cfg))
        self.assertTrue(pipeline.gate(old, old[:5], cfg))

    def test_publish_is_idempotent(self):
        root = tempfile.mkdtemp()
        os.makedirs(os.path.join(root, 'data'))
        trains = [train('1', GOOD, type_='VANDE BHARAT'), train('2', GOOD)]
        trains[0]['schedule'][1]['day_of_journey'] = 2       # needs repair
        with open(os.path.join(root, 'in.json'), 'w') as f:
            json.dump(trains, f)
        cfg = {'sources': [{'name': 's', 'adapter': 'railyatra_json', 'path': 'out.json'}],
               'output': {'trains': 'out.json', 'stations': 'st.json', 'manifest': 'data/manifest.json'},
               'categories': [{'file': 'vb.json', 'type': 'VANDE BHARAT'}]}
        os.replace(os.path.join(root, 'in.json'), os.path.join(root, 'out.json'))
        for _ in range(2):
            r = pipeline.build(cfg, root)
            pipeline.publish(pipeline.outputs(r, cfg), root, pipeline.make_manifest(r, cfg))
        r = pipeline.build(cfg, root)
        self.assertEqual(r['warnings'], {})                       # repairs already applied
        mpath = os.path.join(root, 'data', 'manifest.json')
        before = os.path.getmtime(mpath)
        self.assertEqual(pipeline.publish(pipeline.outputs(r, cfg), root, pipeline.make_manifest(r, cfg)), [])
        self.assertEqual(os.path.getmtime(mpath), before)         # unchanged data touches nothing
        with open(os.path.join(root, 'out.json')) as f:
            self.assertEqual(pipeline.diff(json.load(f), r['trains']), {'added': [], 'removed': [], 'changed': []})
        with open(os.path.join(root, 'vb.json')) as f:
            self.assertEqual([t['train_number'] for t in json.load(f)], ['1'])
        with open(os.path.join(root, 'st.json')) as f:
            self.assertEqual({s['code'] for s in json.load(f)}, {'AAA', 'BBB', 'CCC'})


if __name__ == '__main__':
    unittest.main()
