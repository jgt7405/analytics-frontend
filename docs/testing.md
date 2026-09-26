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
  - Endpoint contract (step 4): `src/api/__tests__/endpoints.test.ts` (the list is well-formed; parameter and query rules), `src/app/api/proxy/[...slug]/__tests__/contract.test.ts` (for every entry and each of its paths: accepted and forwarded to the right backend URL; the other method, unlisted or malformed query parameters, bad path parameters and extra segments rejected without a backend request; known-unregistered paths 404), `src/app/api/proxy/[...slug]/__tests__/route.test.ts` (forwarding details: encoding, timeouts, CSV, cache headers) and `src/api/__tests__/urls.test.ts` (the URL helpers: every entry's built URL is accepted by the proxy; missing, invalid or unlisted parameters throw).
- The API tests log expected validation errors to the console; that noise is normal.

## Smoke tests (Playwright)

- Config: `playwright.config.ts`. Tests: `e2e/*.e2e.ts` (the `.e2e.ts` suffix keeps Jest from picking them up).
- The app runs against a **fixture backend**, not the real one: `e2e/global-setup.ts` starts `e2e/fixture-server.ts` (port 3299), and `playwright.config.ts` points the app's `BACKEND_API_URL` at it. It answers with the curated fixtures in `fixtures/backend/` (below); endpoints without a fixture return 404, so error states are exercised too. `GET http://localhost:3299/__log` lists the backend URLs requested so far.
- `e2e/smoke.e2e.ts` loads all 33 current-season pages, both current-season team pages and one archive page of each type, on a desktop and a mobile viewport against `next start`. It fails on HTTP ≥ 400, a missing `#main-content`, any uncaught page error, or a proxy call redirected for a missing trailing slash.
- `e2e/fixtures.e2e.ts` checks real data renders (standings, the teams page's conference filter, team pages), that the empty-conference, missing-fields and preseason scenarios load without errors, and that archive pages ask the backend for their season.
- Locally, cloud agent sessions use the preinstalled Chromium; elsewhere run `npx playwright install chromium` once. CI installs its own.
- On CI failure, the Playwright report and traces are uploaded as the `playwright-report` artifact.
- Not yet covered: screenshot comparisons (step 7, where file splits need them; baselines must be generated on the CI runner to be stable).

## Fixtures

`fixtures/backend/`: small curated backend responses and the MSW handlers that serve them, shared by Jest and Playwright.

- The JSON files are real backend responses: `scripts/generate-fixtures.py` runs the Flask routes against the backend's own test database fixtures (`npm run fixtures:generate`, with the backend checked out next to this repo). `basketball.team.json` is hand-written (its route uses a SQL JOIN the fake database doesn't support).
- Scenarios are picked by the conference in the path: `Empty` (no teams), `Missing_Fields` (rows keep only `team_name` and `team_id`), `Preseason` (0-0 records, no distributions); `?season=` gives the archived variant.
- `src/api/__tests__/fixtures.test.ts` (Jest, MSW `setupServer`): every scenario matches the response schemas, flows through the proxy and the server fetches, and passes the API client's validators.
- To cover a new page with data, add its endpoint to `ROUTES` in the generator (or a hand-written JSON) and to `FIXTURES` in `fixtures/backend/index.ts`.

## Production checks

- `npm run baseline:lighthouse`: 7 representative routes, median of several runs. `--min-accessibility 90` makes it fail on accessibility (used in CI against the PR's own build); `--warn-performance 80` only warns, because lab performance varies by up to ~17 points between runs.
- `npm run baseline:proxy`: 14 representative proxy endpoints; `--strict` fails on any error or empty/malformed body (used by the daily run).
- Both run in `.github/workflows/production-baseline.yml`. Record meaningful results in `docs/baselines/README.md`.

## Next

- Step 7: screenshot comparisons against the fixtures, generated on the CI runner.
- Step 10: automated accessibility checks (axe) and keyboard/focus tests for tables, charts, selectors and modals.
