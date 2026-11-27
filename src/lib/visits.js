// Anonymous page-load counter via the open-source Abacus service (https://github.com/JasonLovesDoggo/abacus).
// One /hit per browser session, /get afterwards. No cookies, no keys, no app or user data is sent.
// Skipped on localhost and when Do Not Track / Global Privacy Control is on. Fails silently (returns null).

export const COUNTER_ORIGIN = 'https://abacus.jasoncameron.dev';
export const COUNTER_KEY = 'lance6x5.github.io/pto-planner';
export const SESSION_FLAG = 'pto-planner:visit-counted';
const TIMEOUT_MS = 4000;

const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** True when the browser asks not to be tracked (DNT or Global Privacy Control). */
export function prefersNoTracking(nav) {
  if (!nav) return false;
  return nav.doNotTrack === '1' || nav.globalPrivacyControl === true;
}

function readFlag(storage) {
  try {
    return storage?.getItem(SESSION_FLAG) === '1';
  } catch {
    return false;
  }
}

function writeFlag(storage) {
  try {
    storage?.setItem(SESSION_FLAG, '1');
  } catch {
    /* storage unavailable (private mode, disabled): ignore */
  }
}

async function request(fetchImpl, path) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  try {
    const res = await fetchImpl(`${COUNTER_ORIGIN}/${path}/${COUNTER_KEY}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller?.signal
    });
    if (!res || !res.ok) return null;
    const data = await res.json();
    const n = Number(data?.value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Format a count for display, e.g. 12345 -> "12,345". */
export function formatVisits(n, locale) {
  try {
    return new Intl.NumberFormat(locale).format(n);
  } catch {
    return String(n);
  }
}

/**
 * Count this page load (once per session) and return the total, or null on any failure / when skipped.
 * Dependencies are injectable for tests; they default to browser globals.
 * @returns {Promise<number|null>}
 */
export async function fetchVisits({
  fetchImpl = typeof fetch !== 'undefined' ? fetch : undefined,
  storage = safeSessionStorage(),
  nav = typeof navigator !== 'undefined' ? navigator : undefined,
  hostname = typeof location !== 'undefined' ? location.hostname : ''
} = {}) {
  try {
    if (typeof fetchImpl !== 'function') return null;
    if (DEV_HOSTS.has(hostname)) return null;
    if (nav && nav.onLine === false) return null;
    if (prefersNoTracking(nav) || readFlag(storage)) return await request(fetchImpl, 'get');
    const value = await request(fetchImpl, 'hit');
    if (value !== null) writeFlag(storage);
    return value;
  } catch {
    return null;
  }
}

function safeSessionStorage() {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : undefined;
  } catch {
    return undefined;
  }
}
