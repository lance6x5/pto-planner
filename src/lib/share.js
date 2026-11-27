// Share a profile's holiday list through the URL hash, compressed with lz-string.
import LZString from 'lz-string';
import { isISODate } from './dates.js';

/** Encode a holiday list into a URL-safe string. */
export function encodeShare({ name, year, holidays }) {
  const payload = { v: 1, n: name, y: year, h: holidays.map((h) => (h.name ? [h.date, h.name] : [h.date])) };
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

/** Decode a share string. Returns { name, year, holidays } or null if invalid. */
export function decodeShare(code) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(code);
    if (!json) return null;
    const data = JSON.parse(json);
    if (!data || !Array.isArray(data.h)) return null;
    const holidays = data.h
      .filter((e) => Array.isArray(e) && isISODate(e[0]))
      .map(([date, name]) => ({ date, name: String(name || '').slice(0, 100) }));
    return { name: String(data.n || 'Shared holidays').slice(0, 80), year: Number(data.y) || null, holidays };
  } catch {
    return null;
  }
}

export function shareUrl(profile, base = `${location.origin}${location.pathname}`) {
  return `${base}#/share/${encodeShare(profile)}`;
}
