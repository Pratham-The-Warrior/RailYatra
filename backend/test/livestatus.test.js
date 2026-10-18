const test = require('node:test');
const assert = require('node:assert');
const { timetablePosition, stopOffsets, dayOfIsoDate, formatStamp, istMinutes } = require('../src/modules/livestatus/timetablePosition');

// A Date for a wall-clock time in India (UTC+05:30).
const ist = (y, m, d, hh, mm) => new Date(Date.UTC(y, m - 1, d, hh, mm) - 330 * 60000);

// Runs Mondays only. Departs S1 after midnight; zero-length halt at S2.
const TRAIN = {
    train_number: '99999',
    train_name: 'TEST EXP',
    operating_days: { monday: true, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
    schedule: [
        { station_code: 'S0', station_name: 'ALPHA', arrival_time: null, departure_time: '22:00', day_of_journey: 1, distance_km: 0 },
        { station_code: 'S1', station_name: 'BETA', arrival_time: '23:50', departure_time: '00:10', day_of_journey: 1, distance_km: 110 },
        { station_code: 'S2', station_name: 'GAMMA', arrival_time: '02:00', departure_time: '02:00', day_of_journey: 2, distance_km: 200 },
        { station_code: 'S3', station_name: 'DELTA', arrival_time: '05:00', departure_time: null, day_of_journey: 2, distance_km: 350 }
    ]
};
const MON = [2026, 10, 19];   // a Monday
const TUE = [2026, 10, 20];
const at = (day, hh, mm, runDay) => timetablePosition(TRAIN, ist(...day, hh, mm), runDay);

test('stop offsets are monotonic across midnight', () => {
    assert.deepStrictEqual(stopOffsets(TRAIN.schedule), [
        { arr: null, dep: 1320 }, { arr: 1430, dep: 1450 }, { arr: 1560, dep: 1560 }, { arr: 1740, dep: null }
    ]);
});

test('IST helpers are independent of the server timezone', () => {
    assert.strictEqual(formatStamp(istMinutes(ist(...MON, 23, 5))), '23:05 19-Oct');
    assert.strictEqual(dayOfIsoDate('2026-02-31'), null);
    assert.strictEqual(dayOfIsoDate('2026-10-19') * 1440, istMinutes(ist(...MON, 0, 0)));
});

test('before departure: yet to start', () => {
    const r = at(MON, 21, 0);
    assert.strictEqual(r.meta.status, 'NOT_STARTED');
    assert.strictEqual(r.meta.start_date, '2026-10-19');
    assert.strictEqual(r.activeIdx, 0);
    assert.strictEqual(r.isMoving, false);
    assert.strictEqual(r.itinerary[0].isCurrent, true);
    assert.strictEqual(r.itinerary[0].timings.sch_arr, 'SOURCE');
    assert.strictEqual(r.itinerary[0].timings.sch_dep, '22:00 19-Oct');
    assert.strictEqual(r.coveredStationsCount, 0);
    assert.strictEqual(r.remainingTime, '08:00');
});

test('between stations: running, with progress and interpolated distance', () => {
    const r = at(MON, 23, 0);
    assert.strictEqual(r.meta.status, 'RUNNING');
    assert.strictEqual(r.isMoving, true);
    assert.strictEqual(r.activeIdx, 0);
    assert.strictEqual(r.progressPercent, 55);   // 60 of 110 minutes
    assert.strictEqual(r.currentKM, 60);
    assert.deepStrictEqual(r.itinerary.map((s) => [s.isPassed, s.isCurrent, s.isUpcoming]),
        [[true, false, false], [false, false, true], [false, false, true], [false, false, true]]);
    assert.strictEqual(r.coveredStationsCount, 1);
});

test('halted at a station, departure after midnight', () => {
    const r = at(MON, 23, 55);
    assert.strictEqual(r.meta.status, 'AT_STATION');
    assert.strictEqual(r.activeIdx, 1);
    assert.strictEqual(r.itinerary[1].status, 'AT STATION');
    assert.strictEqual(r.itinerary[1].timings.sch_dep, '00:10 20-Oct');
    assert.strictEqual(r.itinerary[1].haltMins, 20);
    assert.strictEqual(r.meta.current_location, 'At BETA');
});

test('the run that started yesterday is found after midnight', () => {
    const r = at(TUE, 0, 30);
    assert.strictEqual(r.meta.start_date, '2026-10-19');
    assert.strictEqual(r.meta.status, 'RUNNING');
    assert.strictEqual(r.activeIdx, 1);
});

test('a zero-length halt counts as departed', () => {
    const r = at(TUE, 2, 0);
    assert.strictEqual(r.meta.status, 'RUNNING');
    assert.strictEqual(r.activeIdx, 2);
    assert.strictEqual(r.progressPercent, 0);
});

test('a completed run is shown for a few hours, then the next run', () => {
    const done = at(TUE, 6, 0);
    assert.strictEqual(done.meta.status, 'COMPLETED');
    assert.strictEqual(done.activeIdx, 3);
    assert.strictEqual(done.itinerary[3].status, 'ARRIVED');
    assert.strictEqual(done.coveredStationsCount, 4);
    assert.strictEqual(done.remainingTime, '--:--');
    const later = at(TUE, 12, 0);
    assert.strictEqual(later.meta.status, 'NOT_STARTED');
    assert.strictEqual(later.meta.start_date, '2026-10-26');
});

test('an explicit run date is honoured', () => {
    const r = at(TUE, 12, 0, dayOfIsoDate('2026-10-19'));
    assert.strictEqual(r.meta.status, 'COMPLETED');
    assert.strictEqual(r.meta.start_date, '2026-10-19');
});

test('the response never claims live data', () => {
    const r = at(MON, 23, 0);
    assert.strictEqual(r.source, 'timetable');
    assert.match(r.notice, /not available/);
    assert.ok(r.itinerary.every((s) => s.is_delayed === false && s.platform === ''));
    assert.strictEqual(r.avgSpeed, 50);   // 350 km in 7 h
    assert.strictEqual(r.meta.fetched_at, '19-Oct 23:00');
});
