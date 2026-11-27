// Profile model: creation and validation/normalization (for imports and URLs).
import { isISODate } from './dates.js';
import { STRATEGIES } from './planner.js';

export const DEFAULT_WORKDAYS = [1, 2, 3, 4, 5]; // Mon–Fri

export function newId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createProfile(overrides = {}) {
  const year = new Date().getFullYear() + 1;
  return normalizeProfile({
    id: newId(),
    name: `My ${year} plan`,
    year,
    balance: 15,
    workdays: DEFAULT_WORKDAYS,
    holidays: [],
    observed: true,
    blackout: [],
    mustInclude: [],
    accepted: [],
    dismissed: [],
    strategy: STRATEGIES.longWeekends,
    vacationCount: 2,
    ...overrides
  });
}

const dateList = (v) => [...new Set((Array.isArray(v) ? v : []).filter(isISODate))].sort();

/** Coerce untrusted data into a valid profile, dropping anything malformed. */
export function normalizeProfile(p = {}) {
  const yearNum = Number(p.year);
  const year = Number.isInteger(yearNum) && yearNum >= 1970 && yearNum <= 2100 ? yearNum : new Date().getFullYear();
  const balance = Math.max(0, Math.round((Number(p.balance) || 0) * 2) / 2); // half-day steps
  const workdays = Array.isArray(p.workdays)
    ? [...new Set(p.workdays.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
    : DEFAULT_WORKDAYS;
  const holidays = (Array.isArray(p.holidays) ? p.holidays : [])
    .filter((h) => h && isISODate(h.date))
    .map((h) => ({ date: h.date, name: String(h.name || '').slice(0, 100) }));
  const uniqueHolidays = [...new Map(holidays.map((h) => [h.date, h])).values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const accepted = (Array.isArray(p.accepted) ? p.accepted : [])
    .filter((a) => a && isISODate(a.start) && isISODate(a.end) && a.start <= a.end)
    .map((a) => ({
      id: String(a.id || `${a.start}_${a.end}`),
      start: a.start,
      end: a.end,
      ptoDates: dateList(a.ptoDates),
      halfDates: dateList(a.halfDates),
      ptoUsed: Math.max(0, Number(a.ptoUsed) || 0),
      daysOff: Math.max(0, Number(a.daysOff) || 0)
    }));
  return {
    id: typeof p.id === 'string' && p.id ? p.id : newId(),
    name: String(p.name || 'Untitled profile').slice(0, 80),
    year,
    balance,
    workdays: workdays.length ? workdays : DEFAULT_WORKDAYS,
    holidays: uniqueHolidays,
    observed: p.observed !== false,
    blackout: dateList(p.blackout),
    mustInclude: dateList(p.mustInclude),
    accepted,
    dismissed: [...new Set((Array.isArray(p.dismissed) ? p.dismissed : []).map(String))],
    strategy: p.strategy === STRATEGIES.bigVacations ? STRATEGIES.bigVacations : STRATEGIES.longWeekends,
    vacationCount: Number(p.vacationCount) === 1 ? 1 : 2,
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString()
  };
}

/** Validate an exported backup. Returns an array of normalized profiles. */
export function parseBackup(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const list = Array.isArray(data) ? data : data && Array.isArray(data.profiles) ? data.profiles : null;
  if (!list) throw new Error('File does not look like a PTO Planner export.');
  return list.map(normalizeProfile);
}

export function buildBackup(profiles) {
  return JSON.stringify({ app: 'pto-planner', version: 1, exportedAt: new Date().toISOString(), profiles }, null, 2);
}
