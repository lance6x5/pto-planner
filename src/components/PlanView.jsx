// Main planning screen: strategy toggle, calendar, suggestions, and summary.
import { useMemo, useState } from 'react';
import Calendar from './Calendar.jsx';
import Suggestions from './Suggestions.jsx';
import Summary from './Summary.jsx';
import { STRATEGIES, acceptSuggestion, remainingBalance } from '../lib/planner.js';
import { formatDay } from '../lib/dates.js';

const BRUSHES = [
  { id: 'select', label: 'Select' },
  { id: 'holiday', label: 'Holiday' },
  { id: 'blackout', label: 'Blackout' },
  { id: 'must', label: 'Must include' },
  { id: 'pto', label: 'PTO day' },
  { id: 'half', label: 'Half PTO day' }
];

const toggleIn = (list, iso) => (list.includes(iso) ? list.filter((d) => d !== iso) : [...list, iso].sort());

export default function PlanView({ profile, update, result, summary, announce }) {
  const [selectedId, setSelectedId] = useState(null);
  const [brush, setBrush] = useState('select');
  const { suggestions, warnings, days } = result;

  const selected = suggestions.find((s) => s.id === selectedId) || null;
  const suggestedDates = useMemo(() => {
    const set = new Set();
    suggestions.filter((s) => s.recommended).forEach((s) => s.ptoDates.forEach((d) => set.add(d)));
    // A selected alternative also shows its PTO days.
    if (selected) selected.ptoDates.forEach((d) => set.add(d));
    return set;
  }, [suggestions, selected]);

  const accept = (s) => {
    try {
      update((p) => acceptSuggestion(p, s));
      setSelectedId(null);
      announce(`Accepted ${s.daysOff} days off using ${s.ptoUsed} PTO.`);
    } catch (err) {
      announce(err.message);
    }
  };

  const dismiss = (s) => {
    update((p) => ({ ...p, dismissed: [...p.dismissed, s.id] }));
    if (selectedId === s.id) setSelectedId(null);
    announce('Suggestion dismissed.');
  };

  /** Apply the active brush to a clicked day. */
  const onDayClick = (day) => {
    const iso = day.iso;
    if (brush === 'select') {
      const hit = suggestions.find((s) => s.start <= iso && iso <= s.end);
      setSelectedId(hit ? hit.id : null);
      return;
    }
    if (brush === 'holiday') {
      update((p) => {
        const exists = p.holidays.some((h) => h.date === iso);
        return {
          ...p,
          holidays: exists
            ? p.holidays.filter((h) => h.date !== iso)
            : [...p.holidays, { date: iso, name: 'Company holiday' }].sort((a, b) => a.date.localeCompare(b.date))
        };
      });
      return;
    }
    if (brush === 'blackout') return update((p) => ({ ...p, blackout: toggleIn(p.blackout, iso) }));
    if (brush === 'must') return update((p) => ({ ...p, mustInclude: toggleIn(p.mustInclude, iso) }));

    if (brush === 'pto' || brush === 'half') {
      const amount = brush === 'half' ? 0.5 : 1;
      // Clicking an existing PTO/half day removes it.
      const owner = profile.accepted.find((a) => a.ptoDates.includes(iso) || a.halfDates.includes(iso));
      if (owner) {
        update((p) => ({
          ...p,
          accepted: p.accepted
            .map((a) => {
              if (a.id !== owner.id) return a;
              const isHalf = a.halfDates.includes(iso);
              return {
                ...a,
                ptoDates: a.ptoDates.filter((d) => d !== iso),
                halfDates: a.halfDates.filter((d) => d !== iso),
                ptoUsed: a.ptoUsed - (isHalf ? 0.5 : 1)
              };
            })
            .filter((a) => a.ptoDates.length + a.halfDates.length > 0)
        }));
        announce(`Removed PTO on ${formatDay(iso)}.`);
        return;
      }
      if (!day.inYear || day.free || day.blackout) {
        announce('PTO can only be placed on a working day in the selected year that is not blacked out.');
        return;
      }
      if (remainingBalance(profile) < amount) {
        announce('Not enough PTO balance remaining.');
        return;
      }
      const entry = {
        id: `manual_${iso}`,
        start: iso,
        end: iso,
        ptoDates: amount === 1 ? [iso] : [],
        halfDates: amount === 0.5 ? [iso] : [],
        ptoUsed: amount,
        daysOff: amount === 1 ? 1 : 0
      };
      update((p) => ({ ...p, accepted: [...p.accepted, entry] }));
      announce(`Added ${amount === 1 ? 'a PTO day' : 'a half PTO day'} on ${formatDay(iso)}.`);
    }
  };

  const removeAccepted = (id) => {
    update((p) => ({ ...p, accepted: p.accepted.filter((a) => a.id !== id) }));
    announce('Removed from plan.');
  };

  return (
    <div className="plan-layout">
      <section className="panel controls" aria-labelledby="strategy-heading">
        <h2 id="strategy-heading">Strategy</h2>
        <div className="segmented" role="radiogroup" aria-label="Suggestion strategy">
          <label>
            <input
              type="radio"
              name="strategy"
              checked={profile.strategy === STRATEGIES.longWeekends}
              onChange={() => update((p) => ({ ...p, strategy: STRATEGIES.longWeekends }))}
            />
            <span>Fewest PTO for long weekends</span>
          </label>
          <label>
            <input
              type="radio"
              name="strategy"
              checked={profile.strategy === STRATEGIES.bigVacations}
              onChange={() => update((p) => ({ ...p, strategy: STRATEGIES.bigVacations }))}
            />
            <span>One or two big vacations</span>
          </label>
        </div>
        {profile.strategy === STRATEGIES.bigVacations && (
          <label className="inline-field">
            Number of vacations{' '}
            <select
              value={profile.vacationCount}
              onChange={(e) => update((p) => ({ ...p, vacationCount: Number(e.target.value) }))}
            >
              <option value={1}>1</option>
              <option value={2}>Up to 2</option>
            </select>
          </label>
        )}
        <fieldset className="brushes">
          <legend>Calendar click action</legend>
          {BRUSHES.map((b) => (
            <label key={b.id} className={`brush brush-${b.id}`}>
              <input type="radio" name="brush" checked={brush === b.id} onChange={() => setBrush(b.id)} />
              <span>{b.label}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <Summary profile={profile} summary={summary} onRemove={removeAccepted} />

      <Suggestions
        suggestions={suggestions}
        warnings={warnings}
        remaining={result.remaining}
        selectedId={selectedId}
        onSelect={(s) => setSelectedId(s.id === selectedId ? null : s.id)}
        onAccept={accept}
        onDismiss={dismiss}
        dismissedCount={profile.dismissed.length}
        onRestore={() => update((p) => ({ ...p, dismissed: [] }))}
      />

      <Calendar
        year={profile.year}
        days={days}
        suggestedDates={suggestedDates}
        highlight={selected}
        onDayClick={onDayClick}
      />
    </div>
  );
}
