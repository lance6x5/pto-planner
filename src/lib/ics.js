// iCalendar (.ics) export for accepted breaks. All-day events, RFC 5545.
import { addDays } from './dates.js';

const compact = (iso) => iso.replace(/-/g, '');

/** Escape text per RFC 5545 (backslash, comma, semicolon, newline). */
export function escapeText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold lines longer than 75 characters with CRLF + space continuation. */
function fold(line) {
  if (line.length <= 75) return line;
  const parts = [];
  for (let i = 0; i < line.length; i += 74) parts.push((i ? ' ' : '') + line.slice(i, i + 74));
  return parts.join('\r\n');
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Build an .ics document from accepted entries.
 * @param {Array} accepted entries with start, end, ptoUsed, daysOff, ptoDates
 * @param {string} profileName used in the event description
 * @param {Date} now timestamp for DTSTAMP (injectable for tests)
 */
export function buildICS(accepted, profileName = 'PTO Plan', now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bridgewise//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const sorted = [...accepted].sort((a, b) => a.start.localeCompare(b.start));
  for (const a of sorted) {
    const isHalf = (a.halfDates || []).length > 0;
    const summary = isHalf ? 'Half-day PTO' : `Time off (${a.ptoUsed} PTO day${a.ptoUsed === 1 ? '' : 's'})`;
    const desc = isHalf
      ? `Half-day PTO from ${profileName}.`
      : `${a.daysOff} consecutive days off using ${a.ptoUsed} PTO day(s). PTO dates: ${(a.ptoDates || []).join(', ')}. From ${profileName}.`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${compact(a.start)}-${compact(a.end)}-${hash(profileName + a.id)}@pto-planner`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(a.start)}`,
      `DTEND;VALUE=DATE:${compact(addDays(a.end, 1))}`, // DTEND is exclusive for all-day events
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(desc)}`,
      'TRANSP:OPAQUE',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
