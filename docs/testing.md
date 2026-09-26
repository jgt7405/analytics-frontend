# Testing

Three layers, from fastest to slowest. None of the local layers needs the backend.

| Layer | Command | Runs in CI | What it catches |
|---|---|---|---|
| Unit (Jest) | `npm test` (`jest --ci` in `verify`) | Every PR | API client exports and URLs, hook wiring, pure helpers |
| Smoke (Playwright) | `npm run test:e2e` after `npm run build` | Every PR | A page that 404s, loses its layout shell, or throws an uncaught JavaScript error |
| Production | `npm run baseline:lighthouse`, `npm run baseline:proxy` | Daily, and on demand | Accessibility regressions, slow pages, backend outages or empty responses |

## Unit tests (Jest)

- Config: `jest.config.js` (via `next/jest`, jsdom environment) and `jest.setup.js` (jest-dom matchers, an `AbortSignal.timeout` polyfill, mocks for `next/router` and `next/image`). Tests that exercise the API mock `global.fetch` themselves; nothing touches the network.
- Files: `**/__tests__/**` and `*.test.ts(x)` next to the code.
- Current suites:
  - `src/services/__tests__/api.test.ts`: every basketball, football and legacy API function is still exported after the `api.ts` split.
  - `src/services/__tests__/api.integration.test.ts`: each method calls the right proxy URL, with season parameters and headers.
  - `src/hooks/__tests__/useStandings.test.ts`: the hook calls `api.getStandings`.
  - `src/lib/__tests__/screenshot-layout.test.ts`: image-export layout helper.
  - Endpoint contract (step 4): `src/api/__tests__/endpoints.test.ts` (the list is well-formed; parameter and query rules), `src/app/api/proxy/[...slug]/__tests__/contract.test.ts` (for every entry and each of its paths: accepted and forwarded to the right backend URL; the other method, unlisted or malformed query parameters, bad path parameters and extra segments rejected without a backend request; known-unregistered paths 404), `src/app/api/proxy/[...slug]/__tests__/route.test.ts` (forwarding details: encoding, timeouts, CSV, cache headers) and `src/api/__tests__/callers.test.ts` (scans the source so every URL the site builds matches an entry).
- The API tests log expected validation errors to the console; that noise is normal.

## Smoke tests (Playwright)

- Config: `playwright.config.ts`. Tests: `e2e/*.e2e.ts` (the `.e2e.ts` suffix keeps Jest from picking them up).
- `e2e/smoke.e2e.ts` loads all 33 current-season pages on a desktop and a mobile viewport against `next start`, and fails on HTTP ≥ 400, a missing `#main-content`, or any uncaught page error. It passes with or without a reachable backend.
- Locally, cloud agent sessions use the preinstalled Chromium; elsewhere run `npx playwright install chromium` once. CI installs its own.
- On CI failure, the Playwright report and traces are uploaded as the `playwright-report` artifact.
- Not yet covered: team and archive pages (they need data to resolve) and screenshot comparisons. Both arrive with the step 4 fixtures (MSW), which will let tests render real-looking data offline.

## Production checks

- `npm run baseline:lighthouse`: 7 representative routes, median of several runs. `--min-accessibility 90` makes it fail on accessibility (used in CI against the PR's own build); `--warn-performance 80` only warns, because lab performance varies by up to ~17 points between runs.
- `npm run baseline:proxy`: 14 representative proxy endpoints; `--strict` fails on any error or empty/malformed body (used by the daily run).
- Both run in `.github/workflows/production-baseline.yml`. Record meaningful results in `docs/baselines/README.md`.

## Next

- Step 4: MSW fixtures and screenshot tests (contract tests done in 4c).
- Step 10: automated accessibility checks (axe) and keyboard/focus tests for tables, charts, selectors and modals.
