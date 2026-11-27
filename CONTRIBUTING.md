# Contributing to Bridgewise

Thanks for helping improve Bridgewise!

## Reporting bugs and requesting features

Use the **Feedback** links in the app footer, or open an issue directly:

- [Report a bug](https://github.com/lance6x5/pto-planner/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/lance6x5/pto-planner/issues/new?template=feature_request.yml)

Please don't include personal data (real names, PTO dates, company details) in issues.

## Triage flow

1. Every new issue gets the `triage` label automatically (from the issue form).
2. The maintainer reviews it, removes `triage`, and relabels it (e.g. confirms `bug` / `enhancement`, or closes it as a duplicate / won't fix).
3. Work happens on a branch, which is opened as a pull request against `main`. The PR description references the issue with `Fixes #N` so the issue closes automatically on merge.
4. CI runs the tests and build; merging to `main` deploys to GitHub Pages.
5. User-facing changes are recorded under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) and moved into a version section when a release is tagged (see "Versioning" in the README).

## Licensing of contributions

Bridgewise is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). By submitting a pull request, you agree that your contribution is licensed to Silverlight DevTech under the same terms, and that Silverlight DevTech may also offer it under its commercial licenses.

## Development

```bash
npm ci
npm run dev
npm test
```
