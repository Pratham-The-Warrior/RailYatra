/** Input validation shared by feature modules. Pure functions only. */

const STATION_CODE = /^[A-Z0-9]{1,8}$/;
const TRAIN_NUMBER = /^\d{1,5}$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Day of week (0 = Sunday) of a YYYY-MM-DD date, or -1 if invalid (e.g. 2026-02-31). */
function weekdayOf(date) {
    const m = DATE.exec(typeof date === 'string' ? date : '');
    if (!m) return -1;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCMonth() !== +m[2] - 1) return -1;
    return d.getUTCDay();
}

/** Integer clamped to [lo, hi]; dflt when the input is not a number. */
function clamp(value, lo, hi, dflt) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
}

const isTrainNumber = (s) => typeof s === 'string' && TRAIN_NUMBER.test(s);

module.exports = { STATION_CODE, weekdayOf, clamp, isTrainNumber };
