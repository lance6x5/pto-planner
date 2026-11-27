// Holiday list parsing (paste / CSV) and "observed on nearest workday" logic.
import { parseDate, addDays, dayOfWeek } from './dates.js';

/**
 * Parse a single line into { date, name }. Tries the whole line as a date
 * first, then splits on commas/tabs/semicolons (longest date prefix wins) so
 * "Jan 1, 2027, New Year's Day" works as well as "2027-01-01,New Year".
 */
export function parseHolidayLine(line, defaultYear) {
  const text = line.trim();
  if (!text) return null;
  const whole = parseDate(text, defaultYear);
  if (whole) return { date: whole, name: '' };

  const splitPoints = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ',' || text[i] === '\t' || text[i] === ';') splitPoints.push(i);
  }
  // Also allow "2027-01-01 New Year" (space after an unambiguous numeric date).
  const numeric = text.match(/^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4})\s+/);
  if (numeric) splitPoints.push(numeric[1].length);

  splitPoints.sort((a, b) => b - a);
  for (const idx of splitPoints) {
    const date = parseDate(text.slice(0, idx), defaultYear);
    if (date) {
      const name = text.slice(idx + 1).trim().replace(/^["']|["']$/g, '').trim();
      return { date, name };
    }
  }
  return null;
}

/**
 * Parse pasted text or CSV content (date,name per line). Header rows and
 * unparseable lines are reported in `errors` rather than throwing.
 */
export function parseHolidayText(text, defaultYear) {
  const holidays = [];
  const errors = [];
  const seen = new Set();
  String(text || '')
    .split(/\r?\n/)
    .forEach((raw, i) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;
      const parsed = parseHolidayLine(line, defaultYear);
      if (!parsed) {
        // Silently skip a header row like "date,name".
        if (!(i === 0 && /date/i.test(line))) errors.push({ line: i + 1, text: line });
        return;
      }
      if (seen.has(parsed.date)) return;
      seen.add(parsed.date);
      holidays.push(parsed);
    });
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  return { holidays, errors };
}

/** Merge new holidays into an existing list (by date; new names fill blanks). */
export function mergeHolidays(existing, incoming) {
  const map = new Map(existing.map((h) => [h.date, { ...h }]));
  for (const h of incoming) {
    const prev = map.get(h.date);
    if (!prev) map.set(h.date, { date: h.date, name: h.name || '' });
    else if (!prev.name && h.name) prev.name = h.name;
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Find the nearest workday to a non-working date. Ties go to the earlier day
 * (so with a Mon–Fri week, Saturday → Friday and Sunday → Monday).
 */
export function nearestWorkday(iso, workdays, taken = new Set()) {
  if (!workdays.length) return null;
  for (let dist = 1; dist <= 7; dist++) {
    const before = addDays(iso, -dist);
    if (workdays.includes(dayOfWeek(before)) && !taken.has(before)) return before;
    const after = addDays(iso, dist);
    if (workdays.includes(dayOfWeek(after)) && !taken.has(after)) return after;
  }
  return null;
}

/**
 * Return a Map of effective holiday dates → name. When `observed` is on, a
 * holiday landing on a non-working day is moved to the nearest workday that
 * isn't already a holiday.
 */
export function effectiveHolidays(holidays, workdays, observed) {
  const result = new Map();
  for (const h of holidays) result.set(h.date, h.name || 'Holiday');
  if (!observed) return result;

  const out = new Map();
  const taken = new Set(holidays.filter((h) => workdays.includes(dayOfWeek(h.date))).map((h) => h.date));
  for (const h of [...holidays].sort((a, b) => a.date.localeCompare(b.date))) {
    const name = h.name || 'Holiday';
    if (workdays.includes(dayOfWeek(h.date))) {
      out.set(h.date, name);
    } else {
      const moved = nearestWorkday(h.date, workdays, taken);
      if (moved) {
        taken.add(moved);
        out.set(moved, `${name} (observed)`);
      } else {
        out.set(h.date, name);
      }
    }
  }
  return out;
}

/** nth weekday (0=Sun) of a month; n = -1 means the last one. */
function nthWeekday(year, month, weekday, n) {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const last = new Date(Date.UTC(year, month, 0));
  const day = last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** US federal holidays for a year (actual dates; use the observed toggle for weekend shifts). */
export function usFederalHolidays(year) {
  const d = (m, day) => `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return [
    { date: d(1, 1), name: "New Year's Day" },
    { date: nthWeekday(year, 1, 1, 3), name: 'Martin Luther King Jr. Day' },
    { date: nthWeekday(year, 2, 1, 3), name: "Presidents' Day" },
    { date: nthWeekday(year, 5, 1, -1), name: 'Memorial Day' },
    { date: d(6, 19), name: 'Juneteenth' },
    { date: d(7, 4), name: 'Independence Day' },
    { date: nthWeekday(year, 9, 1, 1), name: 'Labor Day' },
    { date: nthWeekday(year, 10, 1, 2), name: 'Columbus Day' },
    { date: d(11, 11), name: 'Veterans Day' },
    { date: nthWeekday(year, 11, 4, 4), name: 'Thanksgiving Day' },
    { date: d(12, 25), name: 'Christmas Day' }
  ];
}
