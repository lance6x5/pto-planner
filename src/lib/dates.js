// Date helpers. All dates are handled as ISO strings "YYYY-MM-DD" and computed
// in UTC so that DST and local time zones never shift a day.

export const DAY_MS = 86400000;
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const pad = (n) => String(n).padStart(2, '0');

/** Convert a UTC Date to an ISO day string. */
export function toISO(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Parse an ISO day string into a UTC Date. */
export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Build an ISO string from parts, returning null when the date is invalid (e.g. Feb 30). */
export function makeISO(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return toISO(date);
}

export function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return makeISO(y, m, d) === value;
}

export function addDays(iso, n) {
  return toISO(new Date(fromISO(iso).getTime() + n * DAY_MS));
}

export function diffDays(a, b) {
  return Math.round((fromISO(b) - fromISO(a)) / DAY_MS);
}

export function dayOfWeek(iso) {
  return fromISO(iso).getUTCDay();
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Inclusive list of ISO days between start and end. */
export function eachDay(start, end) {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

const MONTH_LOOKUP = MONTH_NAMES.reduce((acc, name, i) => {
  acc[name.toLowerCase()] = i + 1;
  acc[name.slice(0, 3).toLowerCase()] = i + 1;
  return acc;
}, { sept: 9 });

function monthFromWord(word) {
  return MONTH_LOOKUP[word.toLowerCase().replace(/\.$/, '')] || null;
}

function fullYear(y, defaultYear) {
  if (y === undefined || y === null || y === '') return defaultYear;
  const n = Number(y);
  return y.length <= 2 ? 2000 + n : n;
}

/**
 * Parse a date written in any common format. Supported:
 *  2027-01-01, 2027/1/1, 1/1/2027 (US month/day), 1-1-27, 1/1 (uses defaultYear),
 *  01.02.2027 (European day.month), "Jan 1, 2027", "Friday, January 1 2027", "1 Jan 2027".
 * Returns an ISO string or null.
 */
export function parseDate(input, defaultYear = new Date().getFullYear()) {
  if (input === undefined || input === null) return null;
  const s = String(input).trim().replace(/^["']|["']$/g, '').trim();
  if (!s) return null;
  let m;

  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:T.*)?$/))) {
    return makeISO(+m[1], +m[2], +m[3]);
  }
  if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?$/))) {
    return makeISO(fullYear(m[3], defaultYear), +m[1], +m[2]);
  }
  if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/))) {
    return makeISO(fullYear(m[3], defaultYear), +m[2], +m[1]);
  }
  // Month-name first, optional leading weekday: "Fri, Jan 1st, 2027"
  if ((m = s.match(/^(?:[a-z]+\.?,?\s+)?([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?(?:\s+(\d{4}))?$/i))) {
    const month = monthFromWord(m[1]);
    if (month) return makeISO(fullYear(m[3], defaultYear), month, +m[2]);
  }
  // Day first: "1 January 2027", "Fri 1 Jan 2027"
  if ((m = s.match(/^(?:[a-z]+\.?,?\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?(?:\s+(\d{4}))?$/i))) {
    const month = monthFromWord(m[2]);
    if (month) return makeISO(fullYear(m[3], defaultYear), month, +m[1]);
  }
  return null;
}

/** Human-friendly label for an ISO day, e.g. "Fri, Jan 1, 2027". */
export function formatDay(iso, { weekday = true, year = true } = {}) {
  const d = fromISO(iso);
  const parts = [];
  if (weekday) parts.push(`${WEEKDAY_SHORT[d.getUTCDay()]},`);
  parts.push(`${MONTH_NAMES[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`);
  return parts.join(' ') + (year ? `, ${d.getUTCFullYear()}` : '');
}

export function formatRange(start, end) {
  if (start === end) return formatDay(start);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDay(start, { year: !sameYear })} – ${formatDay(end)}`;
}
