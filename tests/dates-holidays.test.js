import { describe, it, expect } from 'vitest';
import { parseDate, isLeapYear, addDays, daysInYear } from '../src/lib/dates.js';
import { parseHolidayText, effectiveHolidays, usFederalHolidays } from '../src/lib/holidays.js';
import { buildICS } from '../src/lib/ics.js';
import { encodeShare, decodeShare } from '../src/lib/share.js';
import { normalizeProfile, parseBackup, buildBackup } from '../src/lib/profile.js';

describe('parseDate', () => {
  it.each([
    ['2027-01-01', '2027-01-01'],
    ['2027/1/5', '2027-01-05'],
    ['1/5/2027', '2027-01-05'],
    ['1/5/27', '2027-01-05'],
    ['12/25', '2027-12-25'],
    ['25.12.2027', '2027-12-25'],
    ['Jan 1, 2027', '2027-01-01'],
    ['January 1st 2027', '2027-01-01'],
    ['Friday, December 24, 2027', '2027-12-24'],
    ['1 Jan 2027', '2027-01-01'],
    ['Sept 6 2027', '2027-09-06'],
    ['2028-02-29', '2028-02-29']
  ])('parses %s', (input, expected) => {
    expect(parseDate(input, 2027)).toBe(expected);
  });

  it.each(['2027-02-29', '13/1/2027', 'hello', '', 'Foo 3 2027'])('rejects %s', (input) => {
    expect(parseDate(input, 2027)).toBeNull();
  });
});

describe('leap years and boundaries', () => {
  it('detects leap years', () => {
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2027)).toBe(false);
    expect(isLeapYear(2100)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(daysInYear(2028)).toBe(366);
  });
  it('adds days across year end and Feb 29', () => {
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('holiday parsing', () => {
  it('parses CSV with header and names', () => {
    const { holidays, errors } = parseHolidayText('date,name\n2027-01-01,New Year\n"Jan 18, 2027","MLK Day"\nbad line', 2027);
    expect(holidays).toEqual([
      { date: '2027-01-01', name: 'New Year' },
      { date: '2027-01-18', name: 'MLK Day' }
    ]);
    expect(errors).toHaveLength(1);
  });

  it('parses a plain pasted list in mixed formats', () => {
    const { holidays } = parseHolidayText('1/1/2027\nMay 31 2027\n2027-07-05 Independence Day (observed)', 2027);
    expect(holidays.map((h) => h.date)).toEqual(['2027-01-01', '2027-05-31', '2027-07-05']);
    expect(holidays[2].name).toBe('Independence Day (observed)');
  });
});

describe('observed holidays', () => {
  const workdays = [1, 2, 3, 4, 5];
  it('moves Saturday to Friday and Sunday to Monday', () => {
    const map = effectiveHolidays(
      [
        { date: '2027-12-25', name: 'Christmas' }, // Saturday
        { date: '2027-07-04', name: 'July 4' } // Sunday
      ],
      workdays,
      true
    );
    expect(map.has('2027-12-24')).toBe(true);
    expect(map.has('2027-07-05')).toBe(true);
    expect(map.has('2027-12-25')).toBe(false);
  });
  it('leaves dates alone when observed is off', () => {
    const map = effectiveHolidays([{ date: '2027-12-25', name: 'Christmas' }], workdays, false);
    expect([...map.keys()]).toEqual(['2027-12-25']);
  });
  it('respects custom workweeks (Sun–Thu)', () => {
    // 2027-01-01 is a Friday: non-working in a Sun–Thu week → nearest workday is Thu Dec 31.
    const map = effectiveHolidays([{ date: '2027-01-01', name: 'NY' }], [0, 1, 2, 3, 4], true);
    expect([...map.keys()]).toEqual(['2026-12-31']);
  });
  it('generates US federal holidays', () => {
    const h = usFederalHolidays(2027);
    expect(h.find((x) => x.name === 'Thanksgiving Day').date).toBe('2027-11-25');
    expect(h.find((x) => x.name === 'Memorial Day').date).toBe('2027-05-31');
  });
});

describe('ics export', () => {
  it('creates all-day events with exclusive end dates', () => {
    const ics = buildICS(
      [{ id: 'a', start: '2027-11-25', end: '2027-11-28', ptoDates: ['2027-11-26'], halfDates: [], ptoUsed: 1, daysOff: 4 }],
      'Test',
      new Date('2027-01-01T00:00:00Z')
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('PRODID:-//Bridgewise//EN');
    expect(ics).not.toContain('PTO Planner');
    expect(ics).toContain('DTSTART;VALUE=DATE:20271125');
    expect(ics).toContain('DTEND;VALUE=DATE:20271129');
    expect(ics).toContain('\r\n');
  });
});

describe('share + backup', () => {
  it('round-trips a holiday list through the share code', () => {
    const code = encodeShare({ name: 'UHG 2027', year: 2027, holidays: [{ date: '2027-01-01', name: 'New Year' }, { date: '2027-11-26', name: '' }] });
    expect(code).toMatch(/^[A-Za-z0-9+\-$]+$/);
    expect(decodeShare(code)).toEqual({ name: 'UHG 2027', year: 2027, holidays: [{ date: '2027-01-01', name: 'New Year' }, { date: '2027-11-26', name: '' }] });
    expect(decodeShare('garbage!!')).toBeNull();
  });

  it('normalizes untrusted profiles and round-trips backups', () => {
    const p = normalizeProfile({ name: 'X', year: '2027', balance: '12.5', holidays: [{ date: 'nope' }, { date: '2027-01-01' }], workdays: [9, 1, 2] });
    expect(p.balance).toBe(12.5);
    expect(p.holidays).toHaveLength(1);
    expect(p.workdays).toEqual([1, 2]);
    const restored = parseBackup(buildBackup([p]));
    expect(restored[0]).toEqual(p);
    expect(() => parseBackup('{"foo":1}')).toThrow('File does not look like a Bridgewise backup.');
  });

  it('still imports backups made by earlier versions', () => {
    const legacy = JSON.stringify({ app: 'pto-planner', version: 1, exportedAt: '2026-11-01T00:00:00.000Z', profiles: [{ name: 'Old', year: 2027, balance: 5 }] });
    const restored = parseBackup(legacy);
    expect(restored).toHaveLength(1);
    expect(restored[0].name).toBe('Old');
    expect(restored[0].balance).toBe(5);
  });
});
