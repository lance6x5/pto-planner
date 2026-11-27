<p align="center"><img src="public/logo.svg" alt="Bridgewise logo" width="480"></p>

# Bridgewise

**Bridge the gaps. Maximize your time off.**

![Visits](https://abacus.jasoncameron.dev/get/lance6x5.github.io/pto-planner/shield)

A **Silverlight DevTech** project · © 2026 Silverlight DevTech. Source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md).

More apps: https://lance6x5.github.io/

Bridgewise (repo: `pto-planner`) helps you get the most consecutive days off by combining weekends, company holidays, and your PTO balance.
It runs entirely in your browser (React + Vite) and is hosted on GitHub Pages. There is no backend.

**Live app:** https://lance6x5.github.io/pto-planner/

## Features

- **Inputs:** year, PTO balance (half days allowed, e.g. 12.5), workweek (Mon–Fri by default, or custom such as Sun–Thu), company holidays, blackout dates, and must-include dates.
- **Holidays:** add or remove them by hand, paste a list (one per line, in any common date format), import a CSV (`date,name`), or add the US federal holidays in one click.
- **"Observed on nearest workday" toggle:** for holidays that land on a non-working day.
- **Suggestion engine:** ranks breaks by date range, total days off, PTO used, and efficiency (days off ÷ PTO).
  - *Fewest PTO for long weekends:* finds bridge days around holidays and weekends.
  - *One or two big vacations:* finds the longest single break, or the best pair of breaks.
  - Must-include dates are covered first. Recommended picks never add up to more than the remaining balance.
  - Breaks can cross a year boundary (Dec 31 → Jan 1). Leap years are handled.
- **Full-year calendar:** color-coded for weekends, holidays, suggested PTO, accepted PTO, half days, blackout dates, and must-include dates. Clicking a suggestion highlights it on the calendar. A "click action" brush lets you paint holidays, blackout dates, must-include dates, or full/half PTO days onto the calendar.
- **Accept / Dismiss** on each suggestion. The summary panel updates live: total days off, PTO used, PTO remaining, and longest break.
- **Profiles:** save named calendar profiles (e.g. "UHG 2027", "Spouse's company 2027") in IndexedDB.
- **Sharing:** share a profile's holiday list as a URL. The list is compressed with lz-string into the hash (`#/share/...`), so nothing is uploaded.
- **Export:** download the accepted plan as an `.ics` file for Outlook or Google Calendar.
- **Backup:** JSON export/import of all profiles (merge or replace), plus "Reset all data" with a confirmation step.
- **Installable PWA:** works offline. Supports light and dark mode, works on phones and desktops, and the calendar can be used from the keyboard (arrow keys, PageUp/PageDown, Home/End).

## Feedback & issues

Found a bug or have an idea? Use the **Feedback** links in the app footer, or go to the [Issues page](https://github.com/lance6x5/pto-planner/issues):

- [Report a bug](https://github.com/lance6x5/pto-planner/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/lance6x5/pto-planner/issues/new?template=feature_request.yml)

The in-app links open a pre-filled GitHub issue form (app version and browser only, never your plan data). A free GitHub account is required. See [CONTRIBUTING.md](CONTRIBUTING.md) for how issues are triaged.

## Privacy & analytics

Your plans, profiles and dates never leave your browser. The only analytics is an anonymous visit counter shown in the app footer:

- One anonymous page-load count per browser session, via the open-source [Abacus](https://github.com/JasonLovesDoggo/abacus) counter. Later loads in the same session only read the total.
- No cookies, and no personal or app data is sent or stored. [Do Not Track](https://developer.mozilla.org/docs/Web/HTTP/Headers/DNT) and [Global Privacy Control](https://globalprivacycontrol.org/) are respected (nothing is counted), and local development is never counted.
- Like any web request, the call reveals your IP address to the counter service.
- The count is approximate (it includes bots and is not unique visitors) and public (see the badge above).

## Versioning

Bridgewise follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: breaking data/schema change (e.g. saved profiles or backups need migration).
- **MINOR**: new features.
- **PATCH**: bug fixes.

The current version is shown in the app footer. All changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Local development

```bash
npm install
npm run dev      # start the dev server at http://localhost:5173/pto-planner/
npm test         # run the Vitest unit tests once
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` runs on every push to `main` and can also be started by hand (workflow_dispatch). It installs dependencies, runs the tests, builds the app, and deploys it using `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`.

**One-time setup:** Repo Settings → Pages → Source: **"GitHub Actions"**.

If you fork the repo under a different name, change `base` in `vite.config.js` (and `start_url`/`scope` in the PWA manifest) to `/<your-repo-name>/`.

## Project structure

```
src/
  lib/          pure logic: dates, holidays, planner (algorithm), ics, share, profile, storage
  components/   React views: PlanView, Calendar, Suggestions, Summary, SetupView, DataView, ShareImport
  App.jsx       state + hash routing (#/plan, #/setup, #/data, #/share/<code>)
tests/          Vitest unit tests (algorithm, parsing, observed holidays, ics, share, feedback, visits)
```

## How the algorithm works

Every day in the year, plus about 12 days of padding on each side, is marked as either *free* (a non-working weekday, a holiday, or PTO you've already accepted) or a *workday*. A candidate break is a maximal run of days in which every workday is covered by PTO. PTO can only be booked on workdays inside the selected year that aren't blacked out. Candidates are then filtered and ranked by strategy, and picked greedily (long weekends) or as the best single break or pair (big vacations), so that the picks don't overlap and stay within budget.

## License

Bridgewise is **source-available**, not open source in the OSI sense. It is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md) (SPDX: `PolyForm-Noncommercial-1.0.0`).

- **Free for noncommercial use:** personal, educational, research, nonprofit and other noncommercial use is allowed under the license terms.
- **Commercial use needs a separate license:** this includes selling it, hosting it as a paid service, or using it inside a business product. Commercial licenses are available from Silverlight DevTech; to ask, open a [GitHub issue on this repo](https://github.com/lance6x5/pto-planner/issues).
- **Redistribution:** anyone who shares a copy must keep [LICENSE.md](LICENSE.md) and its `Required Notice:` line.

Third-party dependencies keep their own licenses.

## Trademarks

Bridgewise and its logo are trademarks of Silverlight DevTech. The license covers the code only, not the names or logos, so forks must use a different name and logo.
