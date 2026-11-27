// Root component: loads profiles, owns app state, and switches views by hash route.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHashRoute, navigate } from './hooks.js';
import { loadProfiles, saveProfile, deleteProfile, loadSettings, saveSettings, clearAll } from './lib/storage.js';
import { createProfile, normalizeProfile } from './lib/profile.js';
import { usFederalHolidays } from './lib/holidays.js';
import { suggest, summarize } from './lib/planner.js';
import PlanView from './components/PlanView.jsx';
import SetupView from './components/SetupView.jsx';
import DataView from './components/DataView.jsx';
import ShareImport from './components/ShareImport.jsx';
import Feedback from './components/Feedback.jsx';
import VisitCounter from './components/VisitCounter.jsx';
import { APP_VERSION } from './lib/feedback.js';

const NAV = [
  { route: 'plan', label: 'Plan' },
  { route: 'setup', label: 'Setup' },
  { route: 'data', label: 'Profiles & data' }
];

function defaultProfile() {
  const year = new Date().getFullYear() + 1;
  return createProfile({ year, name: `My ${year} plan`, holidays: usFederalHolidays(year) });
}

export default function App() {
  const route = useHashRoute();
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('');
  const dirty = useRef(new Set());

  // Initial load from IndexedDB.
  useEffect(() => {
    (async () => {
      let list = (await loadProfiles()).map(normalizeProfile);
      if (!list.length) {
        const p = defaultProfile();
        list = [p];
        await saveProfile(p);
      }
      const { activeId: saved } = loadSettings();
      setProfiles(list);
      setActiveId(list.some((p) => p.id === saved) ? saved : list[0].id);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (activeId) saveSettings({ ...loadSettings(), activeId });
  }, [activeId]);

  // Debounced persistence of changed profiles.
  useEffect(() => {
    if (!loaded || !dirty.current.size) return;
    const t = setTimeout(() => {
      for (const id of dirty.current) {
        const p = profiles.find((x) => x.id === id);
        if (p) saveProfile(p);
      }
      dirty.current.clear();
    }, 300);
    return () => clearTimeout(t);
  }, [profiles, loaded]);

  const profile = profiles.find((p) => p.id === activeId) || null;

  /** Apply an update function to the active profile. */
  const update = useCallback(
    (fn) => {
      setProfiles((ps) =>
        ps.map((p) => {
          if (p.id !== activeId) return p;
          dirty.current.add(p.id);
          return { ...fn(p), updatedAt: new Date().toISOString() };
        })
      );
    },
    [activeId]
  );

  const announce = useCallback((msg) => {
    setStatus(msg);
    setTimeout(() => setStatus((s) => (s === msg ? '' : s)), 4000);
  }, []);

  const addProfile = useCallback(async (p) => {
    const np = normalizeProfile(p);
    await saveProfile(np);
    setProfiles((ps) => [...ps.filter((x) => x.id !== np.id), np]);
    setActiveId(np.id);
    return np;
  }, []);

  const removeProfile = useCallback(
    async (id) => {
      await deleteProfile(id);
      let remaining = profiles.filter((p) => p.id !== id);
      if (!remaining.length) {
        const p = defaultProfile();
        await saveProfile(p);
        remaining = [p];
      }
      setProfiles(remaining);
      if (id === activeId) setActiveId(remaining[0].id);
    },
    [profiles, activeId]
  );

  const replaceProfiles = useCallback(async (list, mode) => {
    const incoming = list.map(normalizeProfile);
    let next;
    if (mode === 'replace') {
      await clearAll();
      next = incoming;
    } else {
      const map = new Map(profiles.map((p) => [p.id, p]));
      incoming.forEach((p) => map.set(p.id, p));
      next = [...map.values()];
    }
    for (const p of next) await saveProfile(p);
    setProfiles(next);
    setActiveId(next[0]?.id ?? null);
  }, [profiles]);

  const resetAll = useCallback(async () => {
    await clearAll();
    const p = defaultProfile();
    await saveProfile(p);
    setProfiles([p]);
    setActiveId(p.id);
    navigate('plan');
  }, []);

  const result = useMemo(() => (profile ? suggest(profile) : null), [profile]);
  const summary = useMemo(() => (profile && result ? summarize(profile, result.days) : null), [profile, result]);

  const view = route[0];

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <header className="app-header">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="36" height="36" />
          <div>
            <h1>Bridgewise</h1>
            <p className="tagline">Bridge the gaps. Maximize your time off.</p>
          </div>
        </div>
        {profiles.length > 0 && (
          <label className="profile-switch">
            <span className="visually-hidden">Active profile</span>
            <select value={activeId || ''} onChange={(e) => setActiveId(e.target.value)}>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <nav aria-label="Main">
          <ul>
            {NAV.map((n) => (
              <li key={n.route}>
                <a href={`#/${n.route}`} aria-current={view === n.route ? 'page' : undefined}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" tabIndex={-1}>
        {!loaded || !profile ? (
          <p>Loading…</p>
        ) : view === 'share' ? (
          <ShareImport code={route[1]} profile={profile} update={update} addProfile={addProfile} announce={announce} />
        ) : view === 'setup' ? (
          <SetupView profile={profile} update={update} announce={announce} />
        ) : view === 'data' ? (
          <DataView
            profiles={profiles}
            profile={profile}
            setActiveId={setActiveId}
            update={update}
            addProfile={addProfile}
            removeProfile={removeProfile}
            replaceProfiles={replaceProfiles}
            resetAll={resetAll}
            announce={announce}
          />
        ) : (
          <PlanView profile={profile} update={update} result={result} summary={summary} announce={announce} />
        )}
      </main>

      <div className="toast" role="status" aria-live="polite">
        {status}
      </div>
      <footer className="app-footer">
        <Feedback />
        <p>Your data stays in this browser. Use Profiles &amp; data to export a backup.</p>
        <p className="app-version">Bridgewise v{APP_VERSION}</p>
        <VisitCounter />
      </footer>
    </div>
  );
}
