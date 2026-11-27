import { describe, it, expect, vi } from 'vitest';
import { fetchVisits, formatVisits, COUNTER_ORIGIN, COUNTER_KEY, SESSION_FLAG } from '../src/lib/visits.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v))
  };
}

function okFetch(value) {
  return vi.fn(async () => ({ ok: true, json: async () => ({ value }) }));
}

const HOST = 'lance6x5.github.io';

describe('fetchVisits', () => {
  it('hits on the first load of a session, then gets', async () => {
    const storage = memoryStorage();
    const fetchImpl = okFetch(42);
    expect(await fetchVisits({ fetchImpl, storage, nav: {}, hostname: HOST })).toBe(42);
    expect(fetchImpl.mock.calls[0][0]).toBe(`${COUNTER_ORIGIN}/hit/${COUNTER_KEY}`);
    expect(storage.getItem(SESSION_FLAG)).toBe('1');

    expect(await fetchVisits({ fetchImpl, storage, nav: {}, hostname: HOST })).toBe(42);
    expect(fetchImpl.mock.calls[1][0]).toBe(`${COUNTER_ORIGIN}/get/${COUNTER_KEY}`);
  });

  it('sends no credentials, query params or app data', async () => {
    const fetchImpl = okFetch(1);
    await fetchVisits({ fetchImpl, storage: memoryStorage(), nav: {}, hostname: HOST });
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).not.toContain('?');
    expect(opts.credentials).toBe('omit');
    expect(opts.cache).toBe('no-store');
    expect(opts.headers).toBeUndefined();
    expect(opts.body).toBeUndefined();
  });

  it('returns null on network errors and non-OK responses', async () => {
    const storage = memoryStorage();
    const failing = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await fetchVisits({ fetchImpl: failing, storage, nav: {}, hostname: HOST })).toBeNull();
    expect(storage.getItem(SESSION_FLAG)).toBeNull();
    const notOk = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Key not found' }) }));
    expect(await fetchVisits({ fetchImpl: notOk, storage, nav: {}, hostname: HOST })).toBeNull();
    const bad = vi.fn(async () => ({ ok: true, json: async () => ({ nope: true }) }));
    expect(await fetchVisits({ fetchImpl: bad, storage, nav: {}, hostname: HOST })).toBeNull();
  });

  it('does not /hit when Do Not Track or Global Privacy Control is on', async () => {
    for (const nav of [{ doNotTrack: '1' }, { globalPrivacyControl: true }]) {
      const fetchImpl = okFetch(7);
      expect(await fetchVisits({ fetchImpl, storage: memoryStorage(), nav, hostname: HOST })).toBe(7);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[0][0]).toContain('/get/');
    }
  });

  it('skips entirely on localhost', async () => {
    const fetchImpl = okFetch(1);
    expect(await fetchVisits({ fetchImpl, storage: memoryStorage(), nav: {}, hostname: 'localhost' })).toBeNull();
    expect(await fetchVisits({ fetchImpl, storage: memoryStorage(), nav: {}, hostname: '127.0.0.1' })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('still works when storage throws', async () => {
    const storage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      }
    };
    expect(await fetchVisits({ fetchImpl: okFetch(3), storage, nav: {}, hostname: HOST })).toBe(3);
  });
});

describe('formatVisits', () => {
  it('formats with thousands separators', () => {
    expect(formatVisits(12345, 'en-US')).toBe('12,345');
  });
});
