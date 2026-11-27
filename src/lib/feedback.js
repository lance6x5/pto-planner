// Builds pre-filled GitHub "new issue" URLs for in-app feedback.
// No tokens, no API calls: the user submits the issue on GitHub with their own account.
// Never pass user data from the app (profiles, dates, holidays) into these URLs.

export const REPO_URL = 'https://github.com/lance6x5/pto-planner';
export const ISSUES_URL = `${REPO_URL}/issues`;

const TEMPLATES = {
  bug: { template: 'bug_report.yml', title: '[Bug]: ' },
  feature: { template: 'feature_request.yml', title: '[Feature]: ' }
};

/** Version baked in at build time by vite `define`; falls back for plain-node usage. */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

/** Trim a user-agent string so URLs stay short. */
export function trimUserAgent(ua, max = 160) {
  const s = String(ua || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * @param {'bug'|'feature'} type
 * @param {{ version?: string, userAgent?: string }} [opts]
 * @returns {string}
 */
export function buildIssueUrl(type, { version = APP_VERSION, userAgent } = {}) {
  const t = TEMPLATES[type];
  if (!t) throw new Error(`Unknown feedback type: ${type}`);
  const params = [
    ['template', t.template],
    ['title', t.title],
    ['version', String(version)]
  ];
  if (type === 'bug') {
    const env = trimUserAgent(userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : ''));
    if (env) params.push(['environment', env]);
  }
  const query = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `${ISSUES_URL}/new?${query}`;
}
