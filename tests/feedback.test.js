import { describe, it, expect } from 'vitest';
import { buildIssueUrl, trimUserAgent, ISSUES_URL } from '../src/lib/feedback.js';

describe('buildIssueUrl', () => {
  it('builds a bug report URL with version and environment', () => {
    const url = new URL(buildIssueUrl('bug', { version: '1.1.0', userAgent: 'Mozilla/5.0 (Test) & Co' }));
    expect(`${url.origin}${url.pathname}`).toBe(`${ISSUES_URL}/new`);
    expect(url.searchParams.get('template')).toBe('bug_report.yml');
    expect(url.searchParams.get('title')).toBe('[Bug]: ');
    expect(url.searchParams.get('version')).toBe('1.1.0');
    expect(url.searchParams.get('environment')).toBe('Mozilla/5.0 (Test) & Co');
  });

  it('builds a feature request URL without environment', () => {
    const url = new URL(buildIssueUrl('feature', { version: '1.1.0', userAgent: 'UA' }));
    expect(url.searchParams.get('template')).toBe('feature_request.yml');
    expect(url.searchParams.get('title')).toBe('[Feature]: ');
    expect(url.searchParams.has('environment')).toBe(false);
  });

  it('URL-encodes values and keeps URLs short', () => {
    const raw = buildIssueUrl('bug', { version: '1.1.0', userAgent: 'x'.repeat(1000) });
    expect(raw).not.toContain(' ');
    expect(raw.length).toBeLessThan(400);
  });

  it('rejects unknown types', () => {
    expect(() => buildIssueUrl('other')).toThrow();
  });

  it('trims user agents', () => {
    expect(trimUserAgent('  a   b ')).toBe('a b');
    expect(trimUserAgent('abcdef', 4)).toBe('abc…');
  });
});
