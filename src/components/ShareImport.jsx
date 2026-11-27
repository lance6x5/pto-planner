// Landing view for share links (#/share/<code>): preview and import a holiday list.
import { useMemo, useState } from 'react';
import { decodeShare } from '../lib/share.js';
import { mergeHolidays } from '../lib/holidays.js';
import { createProfile } from '../lib/profile.js';
import { formatDay } from '../lib/dates.js';
import { navigate } from '../hooks.js';

export default function ShareImport({ code, profile, update, addProfile, announce }) {
  const data = useMemo(() => (code ? decodeShare(code) : null), [code]);
  const [name, setName] = useState(data?.name || 'Shared holidays');

  if (!data) {
    return (
      <section className="panel">
        <h2>Invalid share link</h2>
        <p>This link could not be read. Ask the sender for a new one.</p>
        <a href="#/plan">Go to planner</a>
      </section>
    );
  }

  const asNew = async () => {
    await addProfile(createProfile({ name: name.trim() || data.name, year: data.year || profile.year, holidays: data.holidays }));
    announce('Created a new profile from the shared holidays.');
    navigate('plan');
  };

  const intoCurrent = () => {
    update((p) => ({ ...p, holidays: mergeHolidays(p.holidays, data.holidays) }));
    announce(`Merged ${data.holidays.length} holidays into "${profile.name}".`);
    navigate('plan');
  };

  return (
    <section className="panel" aria-labelledby="share-in-h">
      <h2 id="share-in-h">Shared holiday list</h2>
      <p>
        <strong>{data.name}</strong>
        {data.year ? ` · ${data.year}` : ''} · {data.holidays.length} dates
      </p>
      <ul className="chip-list">
        {data.holidays.map((h) => (
          <li key={h.date}>
            {formatDay(h.date)}
            {h.name ? ` – ${h.name}` : ''}
          </li>
        ))}
      </ul>
      <label className="block">
        New profile name
        <input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={asNew}>
          Save as new profile
        </button>
        <button type="button" className="btn" onClick={intoCurrent}>
          Merge into "{profile.name}"
        </button>
        <a className="btn" href="#/plan">
          Cancel
        </a>
      </div>
    </section>
  );
}
