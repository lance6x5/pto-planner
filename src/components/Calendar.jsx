// Full-year calendar. Days are buttons with a roving tabindex: Tab enters the
// calendar once, arrow keys move by day/week, Home/End jump within the week,
// PageUp/PageDown move by month, Enter/Space applies the current action.
import { memo, useMemo, useRef, useState } from 'react';
import { MONTH_NAMES, WEEKDAY_SHORT, addDays, daysInMonth, formatDay } from '../lib/dates.js';

const pad = (n) => String(n).padStart(2, '0');

/** Pick the dominant visual state for a day (highest priority first). */
function dayKind(day, suggested) {
  if (day.pto) return 'accepted';
  if (day.halfPto) return 'half';
  if (suggested.has(day.iso)) return 'suggested';
  if (day.holiday) return 'holiday';
  if (day.blackout) return 'blackout';
  if (!day.workday) return 'weekend';
  return 'work';
}

function describe(day, kind) {
  const parts = [formatDay(day.iso)];
  if (day.holiday) parts.push(day.holiday);
  if (kind === 'accepted') parts.push('accepted PTO');
  if (kind === 'half') parts.push('half-day PTO');
  if (kind === 'suggested') parts.push('suggested PTO');
  if (kind === 'weekend') parts.push('non-working day');
  if (day.blackout) parts.push('blackout');
  if (day.must) parts.push('must include');
  return parts.join(', ');
}

const LEGEND = [
  ['weekend', 'Weekend / non-working'],
  ['holiday', 'Holiday'],
  ['suggested', 'Suggested PTO'],
  ['accepted', 'Accepted PTO'],
  ['half', 'Half-day PTO'],
  ['blackout', 'Blackout'],
  ['must', 'Must include']
];

function Calendar({ year, days, suggestedDates, highlight, onDayClick }) {
  const byIso = useMemo(() => new Map(days.map((d) => [d.iso, d])), [days]);
  const [focusIso, setFocusIso] = useState(`${year}-01-01`);
  const gridRef = useRef(null);
  const activeIso = focusIso.startsWith(`${year}-`) ? focusIso : `${year}-01-01`;

  const moveFocus = (iso) => {
    if (!iso.startsWith(`${year}-`)) return;
    setFocusIso(iso);
    requestAnimationFrame(() => gridRef.current?.querySelector(`[data-iso="${iso}"]`)?.focus());
  };

  const onKeyDown = (e, iso) => {
    const keys = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in keys) {
      e.preventDefault();
      moveFocus(addDays(iso, keys[e.key]));
    } else if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault();
      const [y, m, d] = iso.split('-').map(Number);
      const nm = m + (e.key === 'PageDown' ? 1 : -1);
      if (nm >= 1 && nm <= 12) moveFocus(`${y}-${pad(nm)}-${pad(Math.min(d, daysInMonth(y, nm)))}`);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
      moveFocus(addDays(iso, e.key === 'Home' ? -dow : 6 - dow));
    }
  };

  return (
    <section className="panel calendar-panel" aria-labelledby="cal-heading">
      <h2 id="cal-heading">{year} calendar</h2>
      <ul className="legend" aria-label="Legend">
        {LEGEND.map(([k, label]) => (
          <li key={k}>
            <span className={`swatch day-${k}`} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
      <div className="months" ref={gridRef}>
        {MONTH_NAMES.map((name, mi) => {
          const month = mi + 1;
          const first = new Date(Date.UTC(year, mi, 1)).getUTCDay();
          const count = daysInMonth(year, month);
          return (
            <div className="month" key={name} role="group" aria-label={`${name} ${year}`}>
              <h3 className="month-name">{name}</h3>
              <div className="weekdays" aria-hidden="true">
                {WEEKDAY_SHORT.map((w) => (
                  <span key={w}>{w[0]}</span>
                ))}
              </div>
              <div className="days">
                {Array.from({ length: first }, (_, i) => (
                  <span key={`b${i}`} className="day-blank" aria-hidden="true" />
                ))}
                {Array.from({ length: count }, (_, i) => {
                  const iso = `${year}-${pad(month)}-${pad(i + 1)}`;
                  const day = byIso.get(iso);
                  if (!day) return <span key={iso} />;
                  const kind = dayKind(day, suggestedDates);
                  const hl = highlight && highlight.start <= iso && iso <= highlight.end;
                  return (
                    <button
                      key={iso}
                      type="button"
                      data-iso={iso}
                      className={`day day-${kind}${day.must ? ' is-must' : ''}${day.blackout ? ' is-blackout' : ''}${hl ? ' is-highlight' : ''}`}
                      tabIndex={iso === activeIso ? 0 : -1}
                      aria-label={describe(day, kind)}
                      title={describe(day, kind)}
                      onClick={() => {
                        setFocusIso(iso);
                        onDayClick(day);
                      }}
                      onKeyDown={(e) => onKeyDown(e, iso)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default memo(Calendar);
