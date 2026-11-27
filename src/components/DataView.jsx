// Profiles & data: manage named calendar profiles, share links, .ics / JSON export, import, and reset.
import { useState } from 'react';
import { buildBackup, createProfile, newId, parseBackup } from '../lib/profile.js';
import { buildICS } from '../lib/ics.js';
import { shareUrl } from '../lib/share.js';
import { downloadFile, readFileText } from '../lib/download.js';
import { usFederalHolidays } from '../lib/holidays.js';
import { navigate } from '../hooks.js';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profile';

export default function DataView({ profiles, profile, setActiveId, addProfile, removeProfile, replaceProfiles, resetAll, announce }) {
  const [newName, setNewName] = useState('');
  const [link, setLink] = useState('');
  const [importMode, setImportMode] = useState('merge');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const create = async (e) => {
    e.preventDefault();
    const year = profile.year;
    await addProfile(createProfile({ name: newName.trim() || `New profile ${year}`, year, holidays: usFederalHolidays(year) }));
    setNewName('');
    announce('Profile created.');
  };

  const duplicate = async (p) => {
    await addProfile({ ...p, id: newId(), name: `${p.name} (copy)` });
    announce('Profile duplicated.');
  };

  const makeLink = async () => {
    const url = shareUrl(profile);
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      announce('Share link copied to clipboard.');
    } catch {
      announce('Share link ready below.');
    }
  };

  const exportIcs = () => {
    if (!profile.accepted.length) return announce('Accept some breaks first.');
    downloadFile(`${slug(profile.name)}.ics`, buildICS(profile.accepted, profile.name), 'text/calendar');
  };

  const exportJson = () => {
    downloadFile(`bridgewise-backup-${new Date().toISOString().slice(0, 10)}.json`, buildBackup(profiles));
  };

  const importJson = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const list = parseBackup(await readFileText(file));
      if (!list.length) throw new Error('The file contains no profiles.');
      await replaceProfiles(list, importMode);
      announce(`Imported ${list.length} profile${list.length === 1 ? '' : 's'}.`);
    } catch (err) {
      announce(`Import failed: ${err.message}`);
    }
  };

  return (
    <div className="setup-layout">
      <section className="panel" aria-labelledby="profiles-h">
        <h2 id="profiles-h">Calendar profiles</h2>
        <p className="muted">Save separate plans, e.g. "UHG 2027" and "Spouse's company 2027".</p>
        <ul className="profile-list">
          {profiles.map((p) => (
            <li key={p.id} className={p.id === profile.id ? 'is-active' : ''}>
              <span>
                <strong>{p.name}</strong>{' '}
                <span className="muted">
                  · {p.year} · {p.holidays.length} holidays · {p.accepted.length} accepted
                </span>
              </span>
              <span className="btn-row">
                {p.id !== profile.id && (
                  <button type="button" className="btn btn-small" onClick={() => setActiveId(p.id)}>
                    Open
                  </button>
                )}
                <button type="button" className="btn btn-small" onClick={() => duplicate(p)} aria-label={`Duplicate ${p.name}`}>
                  Duplicate
                </button>
                {confirmDelete === p.id ? (
                  <>
                    <button type="button" className="btn btn-small btn-danger" onClick={() => { removeProfile(p.id); setConfirmDelete(null); }}>
                      Confirm delete
                    </button>
                    <button type="button" className="btn btn-small" onClick={() => setConfirmDelete(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-small" onClick={() => setConfirmDelete(p.id)} aria-label={`Delete ${p.name}`}>
                    Delete
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
        <form className="row-form" onSubmit={create}>
          <label className="grow">
            New profile name
            <input type="text" value={newName} maxLength={80} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Spouse's company 2027" />
          </label>
          <button type="submit" className="btn btn-primary">
            Create
          </button>
        </form>
        <p>
          <button type="button" className="link-button" onClick={() => navigate('setup')}>
            Edit "{profile.name}" settings →
          </button>
        </p>
      </section>

      <section className="panel" aria-labelledby="share-h">
        <h2 id="share-h">Share &amp; export</h2>
        <div className="btn-row">
          <button type="button" className="btn" onClick={makeLink}>
            Copy share link (holidays)
          </button>
          <button type="button" className="btn" onClick={exportIcs}>
            Export plan as .ics
          </button>
        </div>
        {link && (
          <label className="block">
            Share link for "{profile.name}" holidays
            <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
          </label>
        )}
        <p className="muted small">The share link contains only the holiday list, compressed into the URL. Nothing is uploaded.</p>
      </section>

      <section className="panel" aria-labelledby="backup-h">
        <h2 id="backup-h">Backup</h2>
        <div className="btn-row">
          <button type="button" className="btn" onClick={exportJson}>
            Export all data (JSON)
          </button>
          <label className="btn file-btn">
            Import JSON
            <input type="file" accept="application/json,.json" onChange={importJson} className="visually-hidden" />
          </label>
        </div>
        <fieldset className="inline-radios">
          <legend>When importing</legend>
          <label>
            <input type="radio" name="import-mode" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} /> Merge with existing
          </label>
          <label>
            <input type="radio" name="import-mode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} /> Replace everything
          </label>
        </fieldset>
      </section>

      <section className="panel danger-zone" aria-labelledby="reset-h">
        <h2 id="reset-h">Reset</h2>
        {!confirmReset ? (
          <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
            Reset all data…
          </button>
        ) : (
          <div role="alertdialog" aria-labelledby="reset-q" className="confirm-box">
            <p id="reset-q">
              Delete all {profiles.length} profile{profiles.length === 1 ? '' : 's'} and settings from this browser? This cannot be undone.
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-danger"
                autoFocus
                onClick={async () => {
                  await resetAll();
                  setConfirmReset(false);
                  announce('All data reset.');
                }}
              >
                Yes, delete everything
              </button>
              <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
