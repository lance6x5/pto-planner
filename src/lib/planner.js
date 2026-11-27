// Core PTO suggestion algorithm.
//
// Model: every day is either "free" (weekend, holiday, or already-accepted PTO)
// or a workday. A break is a maximal run of consecutive days where every
// workday inside it is covered by PTO. We enumerate candidate breaks, score
// them per strategy, and pick a non-overlapping set that fits the PTO budget.
import { addDays, eachDay, dayOfWeek, diffDays } from './dates.js';
import { effectiveHolidays } from './holidays.js';

/** Days of padding on each side of the year so breaks can span Dec 31 → Jan 1. */
export const YEAR_PADDING = 12;
/** Longest break we will consider (keeps enumeration fast). */
export const MAX_BREAK_LENGTH = 45;

/** Minimum days between the two picks of the "two vacations" plan. */
export const MIN_VACATION_GAP = 7;

export const STRATEGIES = {
  longWeekends: 'longWeekends',
  bigVacations: 'bigVacations'
};

/** Flatten all PTO dates from accepted breaks. */
export function acceptedDates(accepted = []) {
  const out = new Set();
  for (const a of accepted) for (const d of a.ptoDates || []) out.add(d);
  return out;
}

/** Sum of PTO used by accepted breaks (supports half days). */
export function ptoUsed(accepted = []) {
  return accepted.reduce((sum, a) => sum + (Number(a.ptoUsed) || 0), 0);
}

export function remainingBalance(profile) {
  return Math.round((Number(profile.balance) - ptoUsed(profile.accepted)) * 100) / 100;
}

/**
 * Build a per-day description for the padded year window.
 * Each entry: { iso, inYear, workday, holiday, pto, blackout, must, free, pickable }
 */
export function buildDays(profile) {
  const { year, workdays } = profile;
  const holidayMap = effectiveHolidays(profile.holidays || [], workdays, profile.observed);
  const blackout = new Set(profile.blackout || []);
  const must = new Set(profile.mustInclude || []);
  const pto = acceptedDates(profile.accepted);
  const half = new Set((profile.accepted || []).flatMap((a) => a.halfDates || []));
  const start = addDays(`${year}-01-01`, -YEAR_PADDING);
  const end = addDays(`${year}-12-31`, YEAR_PADDING);
  const prefix = `${year}-`;

  return eachDay(start, end).map((iso) => {
    const workday = workdays.includes(dayOfWeek(iso));
    const holiday = holidayMap.get(iso) || null;
    const isPto = pto.has(iso);
    const free = !workday || !!holiday || isPto;
    const inYear = iso.startsWith(prefix);
    return {
      iso,
      inYear,
      workday,
      holiday,
      pto: isPto,
      halfPto: half.has(iso),
      blackout: blackout.has(iso),
      must: must.has(iso),
      free,
      // PTO can only be booked on in-year workdays that aren't blacked out.
      pickable: !free && inYear && !blackout.has(iso) && !half.has(iso)
    };
  });
}

/**
 * Enumerate every maximal break that costs between 1 and `budget` PTO days.
 * A break [s, e] is maximal when the day before s and the day after e are not
 * free (otherwise the break would naturally extend).
 */
export function enumerateCandidates(days, budget, { maxLength = MAX_BREAK_LENGTH } = {}) {
  const out = [];
  const n = days.length;
  const maxCost = Math.floor(budget + 1e-9);
  if (maxCost < 1) return out;

  for (let s = 0; s < n; s++) {
    if (s > 0 && days[s - 1].free) continue; // not a maximal start
    if (!days[s].free && !days[s].pickable) continue;
    let cost = 0;
    let freeCount = 0;
    let mustCount = 0;
    const ptoDates = [];
    for (let e = s; e < n && e - s < maxLength; e++) {
      const d = days[e];
      if (d.free) freeCount++;
      else if (d.pickable) {
        cost++;
        ptoDates.push(d.iso);
        if (cost > maxCost) break;
      } else break; // blackout, or a workday outside the year
      if (d.must) mustCount++;

      const endsHere = e === n - 1 || !days[e + 1].free;
      if (endsHere && cost > 0 && freeCount > 0) {
        // Only keep breaks that touch the selected year.
        const startIso = days[s].iso;
        const endIso = d.iso;
        const daysOff = e - s + 1;
        out.push({
          id: `${startIso}_${endIso}`,
          start: startIso,
          end: endIso,
          daysOff,
          ptoUsed: cost,
          ptoDates: [...ptoDates],
          efficiency: Math.round((daysOff / cost) * 100) / 100,
          mustCount
        });
      }
    }
  }
  return out;
}

export function overlaps(a, b) {
  return a.start <= b.end && b.start <= a.end;
}

const byEfficiency = (a, b) =>
  b.efficiency - a.efficiency || b.daysOff - a.daysOff || a.ptoUsed - b.ptoUsed || a.start.localeCompare(b.start);
const byLength = (a, b) =>
  b.daysOff - a.daysOff || b.efficiency - a.efficiency || a.ptoUsed - b.ptoUsed || a.start.localeCompare(b.start);

/** Strategy-specific filtering + ordering. */
export function rankCandidates(candidates, strategy, options = {}) {
  if (strategy === STRATEGIES.bigVacations) {
    const minDays = options.minVacationDays ?? 7;
    return candidates.filter((c) => c.daysOff >= minDays).sort(byLength);
  }
  const maxPto = options.maxLongWeekendPto ?? 4;
  return candidates.filter((c) => c.daysOff >= 3 && c.ptoUsed <= maxPto).sort(byEfficiency);
}

/** Best pair of non-overlapping vacations within budget (maximizes total days off). */
function bestPair(ranked, budget) {
  // Keep only the longest break per (start, cost) to shrink the O(n^2) search.
  const seen = new Set();
  const pool = ranked.filter((c) => {
    const key = `${c.start}|${c.ptoUsed}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!pool.length) return null;

  // Numeric day offsets make gap checks cheap.
  const origin = pool.reduce((m, c) => (c.start < m ? c.start : m), pool[0].start);
  const items = pool.map((c) => {
    const s = diffDays(origin, c.start);
    return { c, s, e: s + c.daysOff - 1 };
  });
  // Bucket by PTO cost; each bucket stays sorted by days off (pool is pre-ranked).
  const buckets = new Map();
  for (const it of items) {
    if (!buckets.has(it.c.ptoUsed)) buckets.set(it.c.ptoUsed, []);
    buckets.get(it.c.ptoUsed).push(it);
  }

  let best = null;
  for (const a of items) {
    for (const [cost, list] of buckets) {
      if (a.c.ptoUsed + cost > budget) continue;
      // First compatible entry in a bucket is the longest one for that cost.
      for (const b of list) {
        if (b === a) continue;
        // Require a real gap so two "vacations" aren't one break split by a single workday.
        const gap = b.s > a.e ? b.s - a.e : a.s > b.e ? a.s - b.e : -1;
        if (gap < MIN_VACATION_GAP) continue;
        const total = a.c.daysOff + b.c.daysOff;
        const totalCost = a.c.ptoUsed + cost;
        if (!best || total > best.total || (total === best.total && totalCost < best.cost)) {
          best = { total, cost: totalCost, picks: [a.c, b.c].sort((x, y) => x.start.localeCompare(y.start)) };
        }
        break;
      }
    }
  }
  return best;
}

/**
 * Produce ranked suggestions for a profile.
 * Returns { suggestions, remaining, warnings } where each suggestion has a
 * `recommended` flag (part of the plan that fits the remaining balance together)
 * and a `reason` ("must-include", "plan", or "alternative").
 */
export function suggest(profile, options = {}) {
  const strategy = profile.strategy || STRATEGIES.longWeekends;
  const maxSuggestions = options.maxSuggestions ?? 15;
  const remaining = remainingBalance(profile);
  const warnings = [];
  const days = buildDays(profile);
  const dismissed = new Set(profile.dismissed || []);
  const accepted = profile.accepted || [];

  const all = enumerateCandidates(days, remaining).filter(
    (c) => !dismissed.has(c.id) && c.ptoDates.length > 0
  );
  const ranked = rankCandidates(all, strategy, options);

  let budget = Math.floor(remaining + 1e-9);
  const chosen = [];
  const canAdd = (c) => !chosen.some((x) => overlaps(x, c));

  // 1. Must-include dates: pick the best break containing each uncovered date.
  const byDate = new Map(days.map((d) => [d.iso, d]));
  for (const iso of [...(profile.mustInclude || [])].sort()) {
    const day = byDate.get(iso);
    if (!day || !day.inYear) continue;
    if (day.pto || accepted.some((a) => a.start <= iso && iso <= a.end)) continue; // already covered
    if (chosen.some((c) => c.start <= iso && iso <= c.end)) continue;
    if (day.blackout && day.workday && !day.holiday) {
      warnings.push(`${iso} is both a must-include and a blackout date.`);
      continue;
    }
    const containing = all
      .filter((c) => c.start <= iso && iso <= c.end && c.ptoUsed <= budget && canAdd(c))
      .sort(strategy === STRATEGIES.bigVacations ? byLength : byEfficiency);
    // A free must-include day (e.g. a weekend) may need no PTO at all.
    if (!containing.length) {
      if (day.free) continue;
      warnings.push(`Not enough PTO left to cover must-include date ${iso}.`);
      continue;
    }
    // Prefer the cheapest efficient break so the trip doesn't eat the whole balance.
    const pick = containing.sort((a, b) => a.ptoUsed - b.ptoUsed || byEfficiency(a, b))[0];
    chosen.push({ ...pick, reason: 'must-include', recommended: true });
    budget -= pick.ptoUsed;
  }

  // 2. Strategy plan.
  if (strategy === STRATEGIES.bigVacations) {
    const count = options.vacationCount ?? profile.vacationCount ?? 2;
    const pool = ranked.filter((c) => c.ptoUsed <= budget && canAdd(c));
    const single = pool[0];
    const pair = count >= 2 ? bestPair(pool, budget) : null;
    const picks = pair && (!single || pair.total > single.daysOff) ? pair.picks : single ? [single] : [];
    for (const p of picks) {
      chosen.push({ ...p, reason: 'plan', recommended: true });
      budget -= p.ptoUsed;
    }
  } else {
    for (const c of ranked) {
      if (c.ptoUsed <= budget && canAdd(c)) {
        chosen.push({ ...c, reason: 'plan', recommended: true });
        budget -= c.ptoUsed;
      }
      if (budget < 1) break;
    }
  }

  // 3. Alternatives: other non-overlapping options that fit the remaining balance on their own.
  const listed = [...chosen];
  for (const c of ranked) {
    if (listed.length >= Math.max(maxSuggestions, chosen.length)) break;
    if (c.ptoUsed > remaining) continue;
    if (listed.some((x) => overlaps(x, c))) continue;
    listed.push({ ...c, reason: 'alternative', recommended: false });
  }

  return { suggestions: listed, remaining, warnings, days };
}

/** Summary stats for the selected year. */
export function summarize(profile, days = buildDays(profile)) {
  const inYear = days.filter((d) => d.inYear);
  const daysOff = inYear.filter((d) => d.free).length;
  const holidays = inYear.filter((d) => d.holiday && d.workday).length;
  // Longest consecutive free run (across the padded window, so year-boundary breaks count).
  let longest = 0;
  let run = 0;
  let longestRange = null;
  let runStart = null;
  for (const d of days) {
    if (d.free) {
      if (run === 0) runStart = d.iso;
      run++;
      if (run > longest) {
        longest = run;
        longestRange = { start: runStart, end: d.iso };
      }
    } else run = 0;
  }
  return {
    daysOff,
    holidays,
    ptoUsed: ptoUsed(profile.accepted),
    remaining: remainingBalance(profile),
    longest,
    longestRange
  };
}

/** Turn a suggestion into an accepted entry (validated against the balance). */
export function acceptSuggestion(profile, suggestion) {
  const remaining = remainingBalance(profile);
  if (suggestion.ptoUsed > remaining + 1e-9) {
    throw new Error('Not enough PTO balance for this break.');
  }
  const entry = {
    id: suggestion.id,
    start: suggestion.start,
    end: suggestion.end,
    ptoDates: [...suggestion.ptoDates],
    ptoUsed: suggestion.ptoUsed,
    daysOff: suggestion.daysOff
  };
  return { ...profile, accepted: [...(profile.accepted || []), entry] };
}
