// Setup screen: year, balance, workweek, holidays (manual / paste / CSV), blackout and must-include dates.
import { useId, useState } from 'react';
import { WEEKDAY_SHORT, eachDay, formatDay, isISODate } from '../lib/dates.js';
import { mergeHolidays, parseHolidayText, usFederalHolidays } from '../lib/holidays.js';
import { readFileText } from '../lib/download.js';

const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Editable list of dates with optional range entry (used for blackout + must-include). */
function DateListEditor({ title, description, dates, onChange, year }) {
  const id = useId();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const add = (e) => {
    e.preventDefault();
    if (!isISODate(from)) return;
    const end = isISODate(to) && to >= from ? to : from;
    const range = eachDay(from, end).slice(0, 366);
    onChange([...new Set([...dates, ...range])].sort());
    setFrom('');
    setTo('');
  };
  const inYear = dates.filter((d) => d.startsWith(`${year}-`));
  return (
    <section className="panel" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      <p className="muted">{description}</p>
      <form className="row-form" onSubmit={add}>
        <label>
          From
          <input type="date" value={from} min={`${year}-01-01`} max={`${year}-12-31`} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label>
          To (optional)
          <input type="date" value={to} min={from || `${year}-01-01`} max={`${year}-12-31`} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="submit" className="btn">
          Add
        </button>
      </form>
      {dates.length > 0 && (
        <>
          <ul className="chip-list">
            {dates.map((d) => (
              <li key={d} className={d.startsWith(`${year}-`) ? '' : 'muted'}>
                {formatDay(d)}
                <button type="button" className="chip-x" aria-label={`Remove ${formatDay(d)}`} onClick={() => onChange(dates.filter((x) => x !== d))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="link-button" onClick={() => onChange([])}>
            Clear all ({dates.length}
            {inYear.length !== dates.length ? `, ${inYear.length} in ${year}` : ''})
          </button>
        </>
      )}
    </section>
  );
}

export default function SetupView({ profile, update, announce }) {
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [paste, setPaste] = useState('');
  const [errors, setErrors] = useState([]);
  const set = (patch) => update((p) => ({ ...p, ...patch }));

  const importText = (text, source) => {
    const { holidays, errors: errs } = parseHolidayText(text, profile.year);
    setErrors(errs);
    if (holidays.length) {
      update((p) => ({ ...p, holidays: mergeHolidays(p.holidays, holidays) }));
    }
    announce(`Imported ${holidays.length} holiday${holidays.length === 1 ? '' : 's'} from ${source}${errs.length ? `, ${errs.length} line(s) skipped` : ''}.`);
  };

  const addHoliday = (e) => {
    e.preventDefault();
    if (!isISODate(newDate)) return;
    update((p) => ({ ...p, holidays: mergeHolidays(p.holidays.filter((h) => h.date !== newDate), [{ date: newDate, name: newName.trim() }]) }));
    setNewDate('');
    setNewName('');
  };

  const onCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      importText(await readFileText(file), file.name);
    } catch {
      announce('Could not read that file.');
    }
    e.target.value = '';
  };

  const yearHolidays = profile.holidays.filter((h) => h.date.startsWith(`${profile.year}-`));
  const otherHolidays = profile.holidays.length - yearHolidays.length;

  return (
    <div className="setup-layout">
      <section className="panel" aria-labelledby="basics-h">
        <h2 id="basics-h">Basics</h2>
        <div className="field-grid">
          <label>
            Profile name
            <input type="text" value={profile.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label>
            Year
            <select value={profile.year} onChange={(e) => set({ year: Number(e.target.value) })}>
              {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 3 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            PTO balance (days)
            <input
              type="number"
              min="0"
              max="365"
              step="0.5"
              inputMode="decimal"
              value={profile.balance}
              onChange={(e) => set({ balance: Math.max(0, Math.round((parseFloat(e.target.value) || 0) * 2) / 2) })}
            />
          </label>
        </div>
        <fieldset className="workweek">
          <legend>Workweek (days you normally work)</legend>
          {WEEKDAY_SHORT.map((w, i) => (
            <label key={w} className="check-pill">
              <input
                type="checkbox"
                checked={profile.workdays.includes(i)}
                onChange={(e) => {
                  const next = e.target.checked ? [...profile.workdays, i] : profile.workdays.filter((d) => d !== i);
                  if (next.length) set({ workdays: [...new Set(next)].sort() });
                }}
                aria-label={WEEKDAY_FULL[i]}
              />
              <span aria-hidden="true">{w}</span>
            </label>
          ))}
          <div className="preset-row">
            <button type="button" className="btn btn-small" onClick={() => set({ workdays: [1, 2, 3, 4, 5] })}>
              Mon–Fri
            </button>
            <button type="button" className="btn btn-small" onClick={() => set({ workdays: [0, 1, 2, 3, 4] })}>
              Sun–Thu
            </button>
          </div>
        </fieldset>
        <label className="toggle">
          <input type="checkbox" checked={profile.observed} onChange={(e) => set({ observed: e.target.checked })} />
          <span>Holidays on a non-working day are observed on the nearest workday</span>
        </label>
      </section>

      <section className="panel" aria-labelledby="hol-h">
        <h2 id="hol-h">Company holidays</h2>
        <form className="row-form" onSubmit={addHoliday}>
          <label>
            Date
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
          </label>
          <label className="grow">
            Name
            <input type="text" value={newName} maxLength={100} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Founders' Day" />
          </label>
          <button type="submit" className="btn btn-primary">
            Add holiday
          </button>
        </form>

        <details>
          <summary>Paste a list or import CSV</summary>
          <label className="block">
            One date per line, any common format (2027-01-01, 1/1/2027, Jan 1 2027). Optionally add a name after a comma.
            <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'2027-01-01, New Year\n5/31/2027, Memorial Day\nDec 24 2027'} />
          </label>
          <div className="preset-row">
            <button type="button" className="btn" disabled={!paste.trim()} onClick={() => { importText(paste, 'pasted text'); setPaste(''); }}>
              Add pasted dates
            </button>
            <label className="btn file-btn">
              Import CSV (date,name)
              <input type="file" accept=".csv,text/csv,text/plain" onChange={onCsv} className="visually-hidden" />
            </label>
            <button
              type="button"
              className="btn"
              onClick={() => {
                update((p) => ({ ...p, holidays: mergeHolidays(p.holidays, usFederalHolidays(p.year)) }));
                announce(`Added US federal holidays for ${profile.year}.`);
              }}
            >
              Add US federal holidays ({profile.year})
            </button>
          </div>
          {errors.length > 0 && (
            <div className="warnings" role="alert">
              <p>Skipped lines that could not be read as dates:</p>
              <ul>
                {errors.slice(0, 10).map((er) => (
                  <li key={er.line}>
                    Line {er.line}: <code>{er.text}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>

        {profile.holidays.length === 0 ? (
          <p className="muted">No holidays yet.</p>
        ) : (
          <>
            <table className="holiday-table">
              <caption className="visually-hidden">Holidays</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Name</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {profile.holidays.map((h) => (
                  <tr key={h.date} className={h.date.startsWith(`${profile.year}-`) ? '' : 'muted'}>
                    <td>{formatDay(h.date)}</td>
                    <td>
                      <input
                        type="text"
                        aria-label={`Name for ${formatDay(h.date)}`}
                        value={h.name}
                        maxLength={100}
                        onChange={(e) =>
                          update((p) => ({ ...p, holidays: p.holidays.map((x) => (x.date === h.date ? { ...x, name: e.target.value } : x)) }))
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-small"
                        aria-label={`Remove ${h.name || formatDay(h.date)}`}
                        onClick={() => update((p) => ({ ...p, holidays: p.holidays.filter((x) => x.date !== h.date) }))}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small">
              {yearHolidays.length} in {profile.year}
              {otherHolidays ? `, ${otherHolidays} in other years (used for breaks that cross the year boundary)` : ''}.{' '}
              <button type="button" className="link-button" onClick={() => update((p) => ({ ...p, holidays: [] }))}>
                Clear all holidays
              </button>
            </p>
          </>
        )}
      </section>

      <DateListEditor
        title="Blackout dates"
        description="Days when PTO can't be taken (they can still be part of a break if they're weekends or holidays)."
        dates={profile.blackout}
        year={profile.year}
        onChange={(blackout) => set({ blackout })}
      />
      <DateListEditor
        title="Must-include dates"
        description="Days you definitely want off, e.g. a family trip. Suggestions will cover these first."
        dates={profile.mustInclude}
        year={profile.year}
        onChange={(mustInclude) => set({ mustInclude })}
      />
    </div>
  );
}
