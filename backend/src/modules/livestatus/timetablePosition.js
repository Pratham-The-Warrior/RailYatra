/**
 * Where a train should be right now according to its timetable.
 *
 * Pure functions: the caller passes the schedule and the current time, so
 * the results are deterministic and testable. All times are Indian Standard
 * Time (UTC+05:30, no daylight saving) regardless of the server's timezone.
 *
 * Minutes are counted from the Unix epoch in IST ("IST minutes"), so a day
 * number is floor(minutes / 1440) and day 0 (1970-01-01) was a Thursday.
 */

const IST_OFFSET_MIN = 330;
const DAY = 1440;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const istMinutes = (date) => Math.floor(date.getTime() / 60000) + IST_OFFSET_MIN;
const weekdayOfDay = (day) => WEEKDAYS[(((day + 4) % 7) + 7) % 7];
const pad = (n) => String(n).padStart(2, '0');

function clockToMin(s) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Calendar parts of a day number: { y, m (0-11), d }. */
function dayParts(day) {
    const dt = new Date(day * DAY * 60000);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

/** "HH:MM DD-Mon" for an IST-minute timestamp (the format the UI parses). */
function formatStamp(min) {
    const day = Math.floor(min / DAY);
    const { m, d } = dayParts(day);
    const t = ((min % DAY) + DAY) % DAY;
    return `${pad(Math.floor(t / 60))}:${pad(t % 60)} ${pad(d)}-${MONTHS[m]}`;
}

const isoDate = (day) => { const { y, m, d } = dayParts(day); return `${y}-${pad(m + 1)}-${pad(d)}`; };

/** Day number of a YYYY-MM-DD date, or null if invalid. */
function dayOfIsoDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const dt = new Date(t);
    if (dt.getUTCMonth() !== +m[2] - 1 || dt.getUTCDate() !== +m[3]) return null;
    return Math.floor(t / 60000 / DAY);
}

/**
 * Arrival/departure offsets in minutes from 00:00 of the day the train starts,
 * non-decreasing along the route. day_of_journey is the ARRIVAL day; a
 * departure clock earlier than the arrival clock means it departs after
 * midnight.
 */
function stopOffsets(schedule) {
    const out = [];
    let prev = 0;
    schedule.forEach((s, i) => {
        const base = (Math.max(1, s.day_of_journey || 1) - 1) * DAY;
        const arrClock = clockToMin(s.arrival_time);
        const depClock = clockToMin(s.departure_time);
        let arr = i === 0 ? null : (arrClock === null ? null : base + arrClock);
        let dep = i === schedule.length - 1 ? null : (depClock === null ? null : base + depClock);
        if (arr !== null) { while (arr < prev) arr += DAY; prev = arr; }
        if (dep !== null) { while (dep < prev) dep += DAY; prev = dep; }
        // A missing time at an intermediate stop: treat it as a zero-length halt.
        if (i > 0 && arr === null) arr = dep !== null ? dep : prev;
        if (i < schedule.length - 1 && dep === null) dep = arr !== null ? arr : prev;
        out.push({ arr, dep });
    });
    return out;
}

// How long a completed run keeps being shown before the next run is.
const SHOW_COMPLETED_MIN = 6 * 60;

/**
 * Picks the run (start day) to show: the most recently started run still en
 * route; else one that arrived within the last 6 hours; else the next run to
 * depart (within a week).
 */
function pickRunDay(offsets, operatingDays, nowMin) {
    const first = offsets[0].dep;
    const last = offsets[offsets.length - 1].arr;
    const today = Math.floor(nowMin / DAY);
    const runs = (day) => operatingDays[weekdayOfDay(day)] === true;
    const earliest = today - Math.ceil((last + SHOW_COMPLETED_MIN) / DAY) - 1;
    for (let day = today; day >= earliest; day--) {
        if (runs(day) && day * DAY + first <= nowMin && nowMin < day * DAY + last) return day;
    }
    for (let day = today; day >= earliest; day--) {
        if (runs(day) && day * DAY + last <= nowMin && nowMin <= day * DAY + last + SHOW_COMPLETED_MIN) return day;
    }
    for (let day = today; day <= today + 7; day++) {
        if (runs(day) && day * DAY + first > nowMin) return day;
    }
    return null;
}

/**
 * Builds the live-status response (same shape the UI renders) for one run.
 * @param train   schedule API object: { train_number, train_name, operating_days, schedule[] }
 * @param now     Date
 * @param runDay  optional day number of the journey start; picked automatically when omitted
 */
function timetablePosition(train, now, runDay) {
    const stops = train.schedule || [];
    if (stops.length < 2) return { error: 'This train has no usable timetable.' };
    const offsets = stopOffsets(stops);
    const nowMin = istMinutes(now);
    const day = runDay !== undefined ? runDay : pickRunDay(offsets, train.operating_days || {}, nowMin);
    if (day === null) return { error: 'This train has no scheduled runs in the coming week.' };

    const t0 = day * DAY;
    const t = nowMin - t0;                       // minutes since 00:00 of the start day
    const n = stops.length;
    const firstDep = offsets[0].dep;
    const lastArr = offsets[n - 1].arr;

    let activeIdx; let isMoving = false; let state;
    if (t < firstDep) { activeIdx = 0; state = 'NOT_STARTED'; }
    else if (t >= lastArr) { activeIdx = n - 1; state = 'COMPLETED'; }
    else {
        activeIdx = 0;
        for (let i = 0; i < n; i++) {
            const { arr, dep } = offsets[i];
            if ((i === 0 || arr <= t) && (dep === null || t < dep)) { activeIdx = i; break; }
            if (dep !== null && dep <= t && i + 1 < n && t < offsets[i + 1].arr) { activeIdx = i; isMoving = true; break; }
        }
        state = isMoving ? 'RUNNING' : 'AT_STATION';
    }

    let progressPercent = 0;
    let currentKM = stops[activeIdx].distance_km || 0;
    if (isMoving) {
        const a = offsets[activeIdx].dep; const b = offsets[activeIdx + 1].arr;
        const f = b > a ? (t - a) / (b - a) : 0;
        progressPercent = Math.round(f * 100);
        const k0 = stops[activeIdx].distance_km || 0; const k1 = stops[activeIdx + 1].distance_km || 0;
        currentKM = Math.round(k0 + f * (k1 - k0));
    }

    const itinerary = stops.map((s, i) => {
        const { arr, dep } = offsets[i];
        const isPassed = state === 'COMPLETED' ? i < n - 1 : (i < activeIdx || (isMoving && i === activeIdx));
        const isCurrent = !isMoving && i === activeIdx;
        const status = state === 'NOT_STARTED' ? 'SCHEDULED'
            : isPassed ? 'DEPARTED' : isCurrent ? (i === n - 1 ? 'ARRIVED' : 'AT STATION') : 'SCHEDULED';
        const arrStr = i === 0 ? 'SOURCE' : formatStamp(t0 + arr);
        const depStr = i === n - 1 ? 'DEST' : formatStamp(t0 + dep);
        return {
            station: s.station_name,
            station_code: s.station_code,
            platform: '',
            status,
            is_delayed: false,
            is_source: i === 0,
            is_destination: i === n - 1,
            timings: { sch_arr: arrStr, act_arr: arrStr, sch_dep: depStr, act_dep: depStr },
            isPassed,
            isCurrent,
            isUpcoming: !isPassed && !isCurrent,
            haltMins: arr !== null && dep !== null ? dep - arr : 0,
            distance_km: s.distance_km
        };
    });

    const active = stops[activeIdx];
    const location = {
        NOT_STARTED: `Yet to start from ${stops[0].station_name}`,
        AT_STATION: `At ${active.station_name}`,
        RUNNING: `Between ${active.station_name} and ${stops[Math.min(activeIdx + 1, n - 1)].station_name}`,
        COMPLETED: `Reached ${stops[n - 1].station_name}`
    }[state];
    const covered = state === 'COMPLETED' ? n : offsets.filter((o, i) => (i === 0 ? o.dep : o.arr) <= t).length;
    const remaining = lastArr - t;
    const totalKm = stops[n - 1].distance_km || 0;
    const durationH = (lastArr - firstDep) / 60;

    return {
        source: 'timetable',
        notice: 'Live running data is not available. Positions and times are estimated from the published timetable and do not reflect delays.',
        meta: {
            train_no: train.train_number,
            train_name: train.train_name,
            start_date: isoDate(day),
            current_location: location,
            fetched_at: formatStamp(nowMin).split(' ').reverse().join(' '),
            status: state,
            total_stations: n
        },
        itinerary,
        activeIdx,
        isMoving,
        coveredStationsCount: covered,
        totalStations: n,
        remainingTime: state === 'COMPLETED' ? '--:--' : `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`,
        displayLocation: '',
        progressPercent,
        currentKM,
        avgSpeed: durationH > 0 ? Math.round(totalKm / durationH) : 0
    };
}

module.exports = { timetablePosition, stopOffsets, pickRunDay, istMinutes, dayOfIsoDate, isoDate, weekdayOfDay, formatStamp };
