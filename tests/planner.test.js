import { describe, it, expect } from 'vitest';
import {
  buildDays,
  enumerateCandidates,
  suggest,
  summarize,
  acceptSuggestion,
  remainingBalance,
  STRATEGIES
} from '../src/lib/planner.js';
import { createProfile } from '../src/lib/profile.js';
import { usFederalHolidays } from '../src/lib/holidays.js';

const base = (overrides = {}) =>
  createProfile({ id: 'test', name: 'Test', year: 2027, balance: 10, holidays: [], ...overrides });

describe('buildDays', () => {
  it('marks weekends free and covers the padded window', () => {
    const days = buildDays(base());
    const jan2 = days.find((d) => d.iso === '2027-01-02'); // Saturday
    const jan4 = days.find((d) => d.iso === '2027-01-04'); // Monday
    expect(jan2.free).toBe(true);
    expect(jan4.free).toBe(false);
    expect(jan4.pickable).toBe(true);
    expect(days[0].iso < '2027-01-01').toBe(true);
    expect(days[days.length - 1].iso > '2027-12-31').toBe(true);
  });

  it('never allows PTO outside the selected year', () => {
    const days = buildDays(base());
    expect(days.filter((d) => !d.inYear).every((d) => !d.pickable)).toBe(true);
  });

  it('handles leap years (2028 has Feb 29)', () => {
    const days = buildDays(base({ year: 2028 }));
    expect(days.filter((d) => d.inYear)).toHaveLength(366);
    expect(days.some((d) => d.iso === '2028-02-29')).toBe(true);
  });
});

describe('enumerateCandidates', () => {
  it('finds the 4-day bridge around a Thursday holiday', () => {
    // Thanksgiving 2027 is Thu Nov 25: take Fri Nov 26 → Thu–Sun = 4 days for 1 PTO.
    const p = base({ holidays: [{ date: '2027-11-25', name: 'Thanksgiving' }] });
    const c = enumerateCandidates(buildDays(p), 10).find((x) => x.start === '2027-11-25' && x.end === '2027-11-28');
    expect(c).toBeDefined();
    expect(c.ptoUsed).toBe(1);
    expect(c.daysOff).toBe(4);
    expect(c.efficiency).toBe(4);
    expect(c.ptoDates).toEqual(['2027-11-26']);
  });

  it('respects the budget', () => {
    const cands = enumerateCandidates(buildDays(base()), 3);
    expect(cands.length).toBeGreaterThan(0);
    expect(cands.every((c) => c.ptoUsed <= 3 && c.ptoUsed >= 1)).toBe(true);
  });

  it('returns nothing when the budget is below one day', () => {
    expect(enumerateCandidates(buildDays(base()), 0.5)).toEqual([]);
  });

  it('only produces maximal breaks (bounded by workdays)', () => {
    const days = buildDays(base());
    const byIso = new Map(days.map((d, i) => [d.iso, i]));
    for (const c of enumerateCandidates(days, 5)) {
      const s = byIso.get(c.start);
      const e = byIso.get(c.end);
      if (s > 0) expect(days[s - 1].free).toBe(false);
      if (e < days.length - 1) expect(days[e + 1].free).toBe(false);
    }
  });

  it('never books PTO on blackout dates', () => {
    const p = base({ blackout: ['2027-11-26'], holidays: [{ date: '2027-11-25', name: 'Thanksgiving' }] });
    const cands = enumerateCandidates(buildDays(p), 10);
    expect(cands.some((c) => c.ptoDates.includes('2027-11-26'))).toBe(false);
  });
});

describe('suggest', () => {
  const holidays = usFederalHolidays(2027);

  it('never recommends more PTO than the balance in total', () => {
    for (const strategy of Object.values(STRATEGIES)) {
      for (const balance of [0, 1, 2.5, 5, 12.5, 25]) {
        const { suggestions } = suggest(base({ holidays, balance, strategy }));
        const total = suggestions.filter((s) => s.recommended).reduce((n, s) => n + s.ptoUsed, 0);
        expect(total).toBeLessThanOrEqual(balance);
        expect(suggestions.every((s) => s.ptoUsed <= balance)).toBe(true);
      }
    }
  });

  it('recommended suggestions do not overlap', () => {
    const { suggestions } = suggest(base({ holidays, balance: 15 }));
    const rec = suggestions.filter((s) => s.recommended);
    for (let i = 0; i < rec.length; i++)
      for (let j = i + 1; j < rec.length; j++) expect(rec[i].end < rec[j].start || rec[j].end < rec[i].start).toBe(true);
  });

  it('long-weekend strategy ranks the most efficient bridge first', () => {
    const { suggestions } = suggest(base({ holidays, balance: 10, strategy: STRATEGIES.longWeekends }));
    const first = suggestions[0];
    expect(first.ptoUsed).toBeLessThanOrEqual(4);
    const max = Math.max(...suggestions.filter((s) => s.recommended).map((s) => s.efficiency));
    expect(first.efficiency).toBe(max);
  });

  it('big-vacation strategy produces long breaks', () => {
    const { suggestions } = suggest(base({ holidays, balance: 10, strategy: STRATEGIES.bigVacations }));
    const rec = suggestions.filter((s) => s.recommended);
    expect(rec.length).toBeGreaterThanOrEqual(1);
    expect(rec.length).toBeLessThanOrEqual(2);
    expect(rec.every((s) => s.daysOff >= 7)).toBe(true);
  });

  it('single big vacation uses one break', () => {
    const { suggestions } = suggest(
      base({ holidays, balance: 10, strategy: STRATEGIES.bigVacations, vacationCount: 1 })
    );
    expect(suggestions.filter((s) => s.recommended)).toHaveLength(1);
    expect(suggestions[0].daysOff).toBeGreaterThanOrEqual(16); // 10 PTO + 3 weekends + a holiday
  });

  it('covers must-include dates first', () => {
    const p = base({ holidays, balance: 10, mustInclude: ['2027-08-11'] });
    const { suggestions } = suggest(p);
    expect(suggestions[0].reason).toBe('must-include');
    expect(suggestions[0].start <= '2027-08-11' && '2027-08-11' <= suggestions[0].end).toBe(true);
  });

  it('excludes dismissed suggestions', () => {
    const p = base({ holidays, balance: 10 });
    const first = suggest(p).suggestions[0];
    const next = suggest({ ...p, dismissed: [first.id] }).suggestions;
    expect(next.some((s) => s.id === first.id)).toBe(false);
  });

  it('supports breaks across the year boundary (Dec 31 → Jan 1)', () => {
    // 2027-12-31 is a Friday; New Year 2028 lands on Saturday. A Mon–Fri PTO in late
    // December should produce a break that runs into January 2028.
    const p = base({
      balance: 5,
      strategy: STRATEGIES.bigVacations,
      holidays: [{ date: '2027-12-24', name: 'Christmas Eve' }, { date: '2028-01-03', name: 'New Year (obs.)' }],
      observed: false
    });
    const days = buildDays(p);
    const crossing = enumerateCandidates(days, 5).filter((c) => c.start <= '2027-12-31' && c.end >= '2028-01-01');
    expect(crossing.length).toBeGreaterThan(0);
    expect(crossing.every((c) => c.ptoDates.every((d) => d.startsWith('2027-')))).toBe(true);
    const best = crossing.sort((a, b) => b.daysOff - a.daysOff)[0];
    expect(best.end).toBe('2028-01-03');
  });
});

describe('accepting', () => {
  it('reduces the remaining balance and turns PTO days into free days', () => {
    const p = base({ holidays: usFederalHolidays(2027), balance: 12.5 });
    const s = suggest(p).suggestions[0];
    const next = acceptSuggestion(p, s);
    expect(remainingBalance(next)).toBe(12.5 - s.ptoUsed);
    const days = buildDays(next);
    expect(s.ptoDates.every((d) => days.find((x) => x.iso === d).free)).toBe(true);
    expect(summarize(next).ptoUsed).toBe(s.ptoUsed);
  });

  it('refuses to exceed the balance', () => {
    const p = base({ balance: 1 });
    expect(() => acceptSuggestion(p, { id: 'x', start: '2027-03-01', end: '2027-03-07', ptoDates: [], ptoUsed: 5, daysOff: 9 })).toThrow();
  });

  it('suggestions shrink as balance is consumed', () => {
    let p = base({ holidays: usFederalHolidays(2027), balance: 4 });
    for (let i = 0; i < 10; i++) {
      const s = suggest(p).suggestions.find((x) => x.ptoUsed <= remainingBalance(p));
      if (!s) break;
      p = acceptSuggestion(p, s);
    }
    expect(remainingBalance(p)).toBeGreaterThanOrEqual(0);
    expect(suggest(p).suggestions.every((s) => s.ptoUsed <= remainingBalance(p))).toBe(true);
  });
});
