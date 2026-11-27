// Persistence: profiles in IndexedDB, small settings in localStorage.
// Every call is wrapped in try/catch; if IndexedDB is unavailable (private
// mode, old browsers) we fall back to localStorage, then to memory.
const DB_NAME = 'pto-planner';
const STORE = 'profiles';
const LS_PROFILES = 'pto-planner:profiles';
const LS_SETTINGS = 'pto-planner:settings';

let dbPromise = null;
let memory = [];

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') throw new Error('IndexedDB unavailable');
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  }).catch((err) => {
    console.warn('IndexedDB unavailable, using fallback storage.', err);
    return null;
  });
  return dbPromise;
}

/** Run a single-store transaction and resolve with the request result. */
function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function lsRead() {
  try {
    return JSON.parse(localStorage.getItem(LS_PROFILES) || '[]');
  } catch {
    return memory;
  }
}

function lsWrite(list) {
  try {
    localStorage.setItem(LS_PROFILES, JSON.stringify(list));
  } catch {
    memory = list;
  }
}

export async function loadProfiles() {
  try {
    const db = await openDB();
    if (db) return (await tx(db, 'readonly', (s) => s.getAll())) || [];
  } catch (err) {
    console.warn('Failed to load profiles', err);
  }
  return lsRead();
}

export async function saveProfile(profile) {
  try {
    const db = await openDB();
    if (db) {
      await tx(db, 'readwrite', (s) => s.put(profile));
      return;
    }
  } catch (err) {
    console.warn('Failed to save profile', err);
  }
  lsWrite([...lsRead().filter((p) => p.id !== profile.id), profile]);
}

export async function deleteProfile(id) {
  try {
    const db = await openDB();
    if (db) {
      await tx(db, 'readwrite', (s) => s.delete(id));
      return;
    }
  } catch (err) {
    console.warn('Failed to delete profile', err);
  }
  lsWrite(lsRead().filter((p) => p.id !== id));
}

export async function clearAll() {
  try {
    const db = await openDB();
    if (db) await tx(db, 'readwrite', (s) => s.clear());
  } catch (err) {
    console.warn('Failed to clear IndexedDB', err);
  }
  try {
    localStorage.removeItem(LS_PROFILES);
    localStorage.removeItem(LS_SETTINGS);
  } catch {
    /* ignore */
  }
  memory = [];
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}');
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
  } catch {
    /* ignore quota / private mode */
  }
}
