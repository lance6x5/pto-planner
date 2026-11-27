# Changelog

All notable changes to Bridgewise (repo: `pto-planner`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-11-27

### Added
- Anonymous visit counter in the app footer (e.g. "12,345 visits"), powered by the open-source [Abacus](https://github.com/JasonLovesDoggo/abacus) counter (`src/lib/visits.js`). Counts one page load per browser session (later loads only read the total), sends no cookies or app data, is skipped on localhost and when Do Not Track / Global Privacy Control is on, times out after 4 seconds, and shows nothing if the counter is unavailable.
- The PWA service worker never caches counter requests (Workbox `NetworkOnly` rule).
- Visits badge and a "Privacy & analytics" section in the README.
- Unit tests for the visit counter.

## [1.1.1] - 2026-11-27

### Fixed
- Replaced leftover "PTO Planner" branding with "Bridgewise" in the `.ics` calendar export (`PRODID:-//Bridgewise//EN`), the backup-import error message, and the JSON backup filename (`bridgewise-backup-YYYY-MM-DD.json`). Internal storage keys are unchanged, so saved data is kept, and backups from earlier versions still import.
- `public/logo.svg` wordmark and tagline are now readable on dark backgrounds (e.g. GitHub dark mode) via a `prefers-color-scheme: dark` style inside the SVG.

## [1.1.0] - 2026-11-27

### Added
- Branding: the app is now **Bridgewise** — "Bridge the gaps. Maximize your time off." Used in the page title, meta description, app header, PWA manifest and README.
- Original SVG logo (arch bridge over a rising sun) with wordmark (`public/logo.svg`), plus a new favicon and PWA icons (192px, 512px, maskable 512px, Apple touch icon) derived from the logo mark.
- Teal and sunrise-amber brand palette wired into the existing CSS theme variables for both light and dark mode.
- App version shown in the footer (`Bridgewise v1.1.0`), injected at build time from `package.json` via `__APP_VERSION__`.
- In-app feedback: "Report a bug" and "Request a feature" links in the footer open a pre-filled GitHub issue (app version and browser info only, no app data) in a new tab.
- GitHub issue forms for bug reports and feature requests (labelled `bug`/`enhancement` + `triage`), and `CONTRIBUTING.md` describing the triage flow.
- This changelog and a Versioning section in the README.

## [1.0.0] - 2026-11-27

### Added
- React + Vite PWA, hosted on GitHub Pages, that runs entirely in the browser.
- Inputs for year, PTO balance (half days allowed), custom workweek, company holidays, blackout dates and must-include dates.
- Holiday entry by hand, pasted lists, CSV import, or one-click US federal holidays, with an "observed on nearest workday" option.
- Suggestion engine with two strategies (fewest PTO for long weekends; one or two big vacations), ranked by days off, PTO used and efficiency; handles year boundaries and leap years.
- Full-year, keyboard-accessible, color-coded calendar with a click-to-paint brush, and Accept / Dismiss on suggestions with a live summary.
- Named profiles stored in IndexedDB, share-by-URL (lz-string compressed), `.ics` export, JSON backup/restore and reset.
- Offline support, light and dark mode, responsive layout.
- GitHub Actions workflow that tests, builds and deploys to GitHub Pages.

[Unreleased]: https://github.com/lance6x5/pto-planner/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/lance6x5/pto-planner/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/lance6x5/pto-planner/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/lance6x5/pto-planner/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/lance6x5/pto-planner/releases/tag/v1.0.0
