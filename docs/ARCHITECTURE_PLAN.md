# Refactor plan: make the site easier for agents to maintain, and faster

Status: **steps 1–6 complete** (2026-09-27; step 5 was done ahead of 3–4 for security; steps 4 and 6 in the PRs listed under their outcomes). Open from step 6: the Search Console re-check around 2026-10-11 (baseline and findings recorded 2026-09-28; fixes in #40 and backend #9). **Step 7 complete** (2026-09-29, #42–#59; see its outcome). **Step 8 complete** (2026-10-01: history charts 8a–8d, #62–#69; export code in `src/lib/export/` with one html2canvas loader, #74–#82; the game preview PDF keeps its own loader and stays unchecked, owner's decision). **Step 9 in progress** (2026-10-01): re-measured (see `docs/baselines/README.md`, "2026-10-01 — before step 9"); the Production baseline workflow now covers the weak pages and desktop (#86); the archive pilot `/football/2025-26/wins/` is deployed (#87) and is kept or reverted on the daily runs that follow; the layout shift on the football wins pages and `/basketball/wins/` is fixed (#89, #91); the header's links no longer prefetch (#93); compare-page logos go through the image optimizer (#95 basketball, #97 football), and so do conference logos (#99) the team pages' chart logos (#102) and the football archive compare page (#106). Baselines are in `docs/baselines/README.md`.

Revision 2 (2026-09-25): folds in feedback from an external review of revision 1 (Architecture Plan Review) plus follow-up adjustments. Findings reflect the
codebase as of 2026-09-25.

## Where to pick up (2026-10-01)

- **Next: step 9, judge the archive pilot (#87).** `/football/2025-26/wins/` now server-renders its default conference like `/football/wins/`. Compare the daily Production baseline runs after its deploy with the 2026-10-01 numbers (proxy calls 1 → 0 expected; LCP, CLS, performance over several days). If it beats them, extend it to the other 22 archive pages, a few per PR; if not, revert it. Then, as candidates: `/basketball/<season>/wins/` (desktop CLS 0.075: still loads its data in the browser, so it waits for the archive pilot's verdict); the remaining full-size logo images (compare-schedules' team columns, next, with `resizedLogoSrc`; compare-schedules, what-if, game preview, schedule tables; the scatterplot's `unoptimized`), one PR each. Re-measure with the "Production baseline" workflow (agent sessions can't start it on demand, 403; a push that touches its scripts runs it, and it runs daily) and `npm run size`. Each item is kept only if it beats the baselines.
- **Open from step 6:** the Search Console re-check around 2026-10-11 against `docs/baselines/README.md` (record a summary only; the owner does the clicks, so give tap-by-tap steps).
- **Owner decisions on record:** the game preview PDF stays unchecked with its own loader; the scatterplot stays wider than a phone screen; per-sport presentation differences kept in the chart themes are visible changes that need the owner's OK; a logo-resizing PR may merge with the Visual check red when every differing pixel is inside a logo box and the diffs were reviewed (2026-10-02, see 9h).
- **Open:** no PRs or branches. A reminder for the Search Console re-check is scheduled for 2026-10-11 in the step 9 session. The umbrella repo (`jthom-analytics-umbrella`) points at current `main` of both submodules.

## Guiding principles

1. **Measure before optimizing.** No performance change ships without a recorded baseline and a before/after number.
2. **Small, reversible steps.** One concern per PR. Framework upgrades, URL changes, the PWA replacement and component merges each get their own migration with a rollback point.
3. **Avoid building a homemade framework.** Centralize what is genuinely duplicated; keep endpoint-specific logic explicit. Generate code only when a prototype proves the result is simpler.
4. **Public URLs are a product decision, not an internal refactor.** Route changes carry redirects, canonical metadata and SEO checks.
5. **Coordinate cache layers, don't make them identical.** Freshness is set per class of data.

## What I found

| Area | What's there | Why it matters for agents |
|---|---|---|
| **Adding an endpoint** | Every new endpoint has to be registered in up to 4 places. The proxy (`src/app/api/proxy/[...slug]/route.ts`, 950 lines) has a hand-written branch per URL shape. `shared-request.ts` has its own allowlist. `basketball-api.ts` / `football-api.ts` hold the client methods, and `server-api.ts` holds server copies. | A small change touches many files, and missing one fails silently. |
| **Basketball vs football duplication** | Some pairs are near-copies. `BballStandingsHistoryChart` vs `FootballStandingsHistoryChart` differ by about 81 of roughly 700 lines. The ConfBids and FirstPlace charts differ by about 180 of roughly 800 lines. | A fix made in one sport silently misses the other. |
| **Very large files** | `basketball/game-preview/page.tsx` is 3,895 lines. `BasketballWhatIfScenarios` has 1,815, `BballNonConfAnalysisTable` 1,683 and `BasketballTeamWinsBreakdown` 1,565. | Too big for an agent to hold in context or edit safely. |
| **Season handling** | `/basketball/[season]/*` pages are `"use client"` wrappers, so they get no server rendering or metadata. A block in `next.config.js` marked "TEMPORARY" rewrites the plain basketball URLs to `/2025-26/`, and `2025-26` is hard-coded in 7 files. | The yearly season rollover is manual and easy to get wrong. |
| **Stale docs** | `CLAUDE.md` says Recharts, but the site uses Chart.js. It mentions Lighthouse CI, but there is no `.github/` folder at all. There are 5 separate root-level `.md` files, one of them 69 KB. The README is still the create-next-app template. | Agents trust these docs and get misled. |
| **Safety net** | 4 test files and no CI. | An agent has no automatic way to check its own work. |
| **Code conventions** | About 1,060 inline `style={{…}}` uses, although CLAUDE.md says to avoid inline styles. There are 16 hand-rolled resize/`isMobile` hooks despite `useResponsive.ts`, 33 raw `fetch()` calls in components, and 187 `console.log`s. React Query key names are inconsistent (e.g. `"football-conf-data-proxy-fixed"`). | Agents copy whatever pattern they see nearby, so the inconsistencies multiply. |
| **Config drift** | The server fetch uses the `NEXT_PUBLIC_BACKEND_URL` env var and caches for 1 hour. The proxy uses `BACKEND_API_URL` and caches for 5 minutes. The offline (PWA) cache rule points at `analytics-backend-production…`, which is the wrong host, so the rule never fires. `sitemap.ts` hard-codes the backend URL. | Two sources of truth for the same thing. |
| **Framework and tooling** | Next 14.2, React 18, ESLint 8 with a mix of legacy config and FlatCompat. `next-pwa` (unmaintained, webpack-only). `package.json` `engines` says Node `>=18.17.0`. A dev-only custom webpack block in `next.config.js`. | Next 16 is the current release line; upgrading touches all of these at once. |
| **Committed junk** | `build.log`, `dev.log`, `build_output.txt`, and the generated `public/sw.js` and `workbox-*.js` are checked in. | Noisy diffs, and generated files get edited by mistake. |

---

## Step 1 — Repeatable builds, verify commands, baselines

**Goal:** a trustworthy "is it done?" check, and numbers to compare every later change against.

1. **Repeatable builds and tests.** Remove the logs and generated service-worker files from git and add them to `.gitignore`. Make sure `npm ci && npm run build && npm test` gives the same result on a clean checkout, with no dependence on the live backend.
2. **Lint through the ESLint CLI**, not `next lint`, which is removed in Next 16. Doing it now means the verify commands don't change during the upgrade.
3. **Two verify commands.**
   - `npm run verify` (fast, for routine work): lint, type-check, unit tests.
   - `npm run verify:full` (CI and pre-merge): the above plus production build, bundle budgets, and Playwright smoke and screenshot tests.
4. **Record baselines** into `docs/baselines/` from a production build:
   - Build duration.
   - Per-route JS bundle sizes (First Load JS).
   - Lighthouse scores and Core Web Vitals for a small representative set of routes (e.g. football wins, basketball standings, a team page, compare, game preview, an archive page), plus Speed Insights field data.
   - Backend request counts per page load, and render times for the heaviest pages.
   - Current error and timeout rates from the proxy, as far as logs allow.

**Outcome (complete, 2026-09-25):**

| Item | Result |
|---|---|
| Repeatable builds and tests | Logs, generated service-worker files and unused template SVGs removed from git and ignored. `npm ci`, `npm run build` and `npm test` pass on a clean checkout with the backend unreachable. |
| ESLint CLI | `lint` now runs `eslint .`. The old `next lint` never ran: it stopped at an interactive setup prompt. The CLI found 23 errors, all fixed or configured: a real crash in `BowlPicksProjectionChart` (hooks called after early returns, so React threw once data loaded), `prefer-const` in the contact route, and `require()` in tests/config. 0 errors, 41 warnings remain. |
| Verify commands | `npm run verify` (lint, type-check, tests; ~30 s) and `npm run verify:full` (plus production build and `npm run size`). Documented in `CLAUDE.md`. Playwright smoke/screenshot tests and bundle budgets moved to step 2: budgets need these baselines, and page tests need the step 4 fixtures to run without the backend. |
| Build and bundle baselines | Build 80–81 s (cold, cloud container). Per-route gzipped JS for all 63 routes via `scripts/route-sizes.mjs`: 133–261 kB, median 179 kB. |
| Lighthouse (lab) | 7 routes against production via `scripts/lighthouse-baseline.mjs`, run from the "Production baseline" GitHub workflow: performance 84–98, accessibility 96–100. Scores vary by up to 17 points between runs, so compare only across multiple runs. |
| Field Web Vitals | Vercel Speed Insights: Real Experience Score 100 on desktop and mobile, P75 LCP 1.53 s / 1.24 s. Weak pages: `/football/seed` on desktop (47), `/football/compare` (59), `/football/twv` on mobile (85). |
| Backend requests and proxy reliability | Proxy calls per page from Lighthouse (0 on `/football/wins/`, 10 on team pages). `scripts/proxy-probe.mjs`: 0 of 70 calls failed, CDN cache working (~25 ms cached, up to 572 ms uncached), and every browser call pays a trailing-slash redirect (fix added to step 3). |

Other findings carried forward: 48 dependency vulnerabilities (step 2), the redirect fix (step 3), and the weak-page list (step 9).

## Step 2 — CI and agent setup

1. **GitHub Actions.**
   - `verify:full` on every PR, extended with the two pieces deferred from step 1: Playwright smoke and screenshot tests, and bundle budgets.
   - Bundle budgets per route, set from the step 1 baselines (`totalKb` from `npm run size`) plus a tolerance, not an arbitrary global number.
   - Lighthouse CI against a production build on the representative routes. Accessibility stays an error-level gate; performance starts as a warning until results are stable.
   - A **scheduled check against the live backend** (e.g. daily) that calls every registered endpoint and validates the response shape, so test fixtures can't hide backend drift. Extend the existing `production-baseline.yml` workflow and `scripts/proxy-probe.mjs` rather than starting over.
   - Renovate or Dependabot, gated on CI.
   - **Triage the 48 known dependency vulnerabilities** reported by `npm ci` (1 critical, 28 high), fixing what can be fixed without a framework upgrade and noting which ones wait for step 5.
2. **Shared conventions in `AGENTS.md`**, readable by any tool. `CLAUDE.md` becomes a short file that imports `@AGENTS.md` and adds only Claude-specific notes.
3. **Fix the docs.**
   - Correct the stale content (Chart.js, real env vars, real routes, actual data flow).
   - Move the root `.md` files into `docs/`: `architecture.md`, `data-flow.md`, `design-system.md` (from PAGE_MODERNIZATION_GUIDE), and `docs/decisions/` for the ARCHIVE/WIN_VALUES write-ups and future decision records.
   - Short per-folder notes in `src/app/`, `src/components/features/` and `src/services/`.
   - Replace the template README with real setup steps.
4. **Documented, platform-neutral setup.** State the supported Node version (in `.nvmrc` and `engines`) and a single setup command that works on Windows, macOS, Linux and cloud containers.
5. **Optional SessionStart hook** (`.claude/settings.json`) as a convenience for cloud sessions: run `npm ci` only when `node_modules` is missing or out of date with the lockfile. It is not the primary setup contract.
6. **Step-by-step guides as Claude skills** (`.claude/skills/`): `add-endpoint`, `add-page`, `season-rollover`, `modernize-page` (condensed from the 69 KB guide), `verify-visually` (Playwright screenshots).
7. **Automated boundary checks**, not just folder documentation. Use `no-restricted-imports` (or dependency-cruiser) to enforce, for example:
   - Presentation components don't own network access. Fetching is allowed in pages, route handlers and shared data modules.
   - Basketball code doesn't import football code and vice versa; shared code lives in shared folders.
8. **Advisory lint signals, introduced gradually.**
   - `max-lines` (about 600) as a warning only. Mixed responsibilities matter more than raw length.
   - `no-explicit-any` as an error for new or changed files only.
   - `no-console` only after the shared logger (step 3) is confirmed working in server and client bundles, with redaction rules.

**Outcome (complete, 2026-09-25):**

| Item | Result |
|---|---|
| CI | `.github/workflows/ci.yml` on every PR and push to `main`. *Verify* job: lint, strict lint on changed files, type-check, Jest, build, bundle budgets, Playwright smoke tests. *Lighthouse* job: the PR's own build against live data on 7 routes; fails below 90 accessibility, warns below 80 performance. |
| Deferred from step 1 | Playwright smoke tests: all 33 current-season pages on desktop and mobile, failing on HTTP errors, a missing page shell or any uncaught JS error (`npm run test:e2e`). Bundle budgets per route from the baseline, +5% or 3 kB tolerance (`npm run size:check`). Screenshot tests and team/archive pages wait for step 4 fixtures. |
| Live-backend check | `production-baseline.yml` now runs daily (11:17 UTC); the proxy probe's `--strict` mode fails on errors or empty/non-JSON bodies, and a failed run emails the owner. Response-shape checks are basic until step 4's schemas. |
| Dependencies | 48 → 16 known vulnerabilities. `npm audit fix` for in-range updates; nodemailer 7 → 10 (contact form: SMTP/header injection and DoS advisories); Lighthouse 12 → 13 (dev only). The remaining 16 are in `next` (2 critical, several high), `eslint-config-next`, `typescript-eslint` and `next-pwa`, and need step 5. Dependabot opens weekly grouped updates; framework majors are excluded. |
| Agent docs | `AGENTS.md` (tool-neutral rules); `CLAUDE.md` imports it; folder notes in `src/app`, `src/services`, `src/components/features`. |
| Docs | `docs/architecture.md`, `docs/data-flow.md` (request path, all cache layers, backend contract), `docs/testing.md`. Root docs moved into `docs/`; the modernization guide kept its name (`docs/PAGE_MODERNIZATION_GUIDE.md`) because about 30 code comments cite it. README rewritten. |
| Setup | `.nvmrc` (22) and `engines` `>=20.9.0`. SessionStart hook runs `npm ci` in cloud sessions only when needed. |
| Skills | `add-endpoint`, `add-page`, `season-rollover`, `modernize-page`, `verify-visually` (with `scripts/screenshot.mjs`). |
| Boundaries and lint | Basketball ↔ football imports are an ESLint error (no current violations). Direct `fetch` in components warns (16). Files over 600 lines warn (30). `no-explicit-any` is an error for changed files via `npm run lint:changed`. `no-console` became an error in step 3d. |
| Fix to step 1 | The generated `public/sw.js` and `workbox-*.js` were still tracked (re-staged while splitting step 1 commits); now removed. No production effect. |

## Step 3 — Env config, shared request layer, cache classes

1. **One validated env module** (`src/config/env.ts`) with a single server-only `BACKEND_API_URL`. Remove `NEXT_PUBLIC_BACKEND_URL` and the hard-coded URL in `sitemap.ts`.
2. **One shared request layer** used by both server fetches and the client (via the proxy): timeout, error mapping, logging and retry rules live in one place. `server-api.ts` and `shared-request.ts` both build on it.
   - It builds proxy URLs **with a trailing slash**. Today every browser call goes to `/api/proxy/...` without one, and `trailingSlash: true` answers each with a 308 redirect before the real request, adding a round trip to every data fetch (measured in step 1).
3. **Named freshness classes**, assigned per endpoint:

   | Class | Examples | Freshness |
   |---|---|---|
   | `live` | Upcoming and in-progress games | Very short or no caching |
   | `currentStandings` | Standings, projections, seeds | A few minutes |
   | `historical` | History charts, archived seasons | Hours to days |
   | `referenceData` | Team and conference lists | Long-lived |
   | `scenario` | What-if calculations, exports (POST) | Never in a shared cache |

   Each class maps to coordinated, not identical, settings for React Query (`staleTime`/`gcTime`), server fetches (`revalidate`), CDN headers (`s-maxage`/`stale-while-revalidate`) and the browser. **Error responses are never cached.**
4. **A query-key factory** (`queryKeys.football.standings(conf, season)`) to replace the ad-hoc key strings.
5. **Shared logger** with redaction rules, working in both server and client bundles. It records endpoint identity, duration, status, cache outcome and a request ID for correlation. It replaces the `console.log`s, including the proxy's field-by-field debug logging.

**Outcome (complete, 2026-09-26), in four PRs:**

| Part | What | Result |
|---|---|---|
| 3a (#19) | `src/config/env.ts` (server-only `BACKEND_API_URL`; `NEXT_PUBLIC_BACKEND_URL` kept as a deprecated fallback); `proxyUrl()` for every proxy URL | The 308 redirect before every browser data call is gone (63 call sites; ESLint blocks hand-built `/api/proxy` strings; smoke tests fail on any proxy 308). Integration tests that could never fail now assert URLs. The shared request layer (item 2) is deferred to step 4's endpoint list, which replaces both request paths. |
| 3b (#20) | Freshness classes in `src/lib/cache-policy.ts`, decided in `docs/decisions/cache-classes.md` | One setting per class for React Query, server fetches and the CDN (was 5 min / 1 h / 5 min, disagreeing). Team lists are now cached 24 h and history 1 h; live games 30 s. Server first paint is no longer up to an hour older than the CDN. Errors and POSTs are `no-store`. The proxy probe now calls URLs the way the client does (trailing slash) and fails on redirects; its first run on production after #19 found 0 redirects in 80 calls (was 70 of 70). |
| 3c (#21) | Query-key factory `src/lib/query-keys.ts` | All 36 queries (hooks and the three bowl components) take keys from `queryKeys.<sport>.<resource>(...)`; every key starts with its sport so one sport can be invalidated at once. ESLint rejects inline key arrays; a unit test checks keys are unique and sport-prefixed. Five hooks nothing imported were deleted (`useConferenceData`, whose key had a season its fetch ignored; `useFootballTeams`; `useFootballCFPHistory`; `useFootballTeamHistory`, a duplicate of `useFootballTeamAllHistory` under another key; `useBasketballWhatIfConferences`). |
| 3d | Shared logger `src/lib/logger.ts`; ESLint `no-console` is now an error in `src/` | 278 `console.*` calls in 48 files replaced. The proxy's 50 (field-by-field debug dumps, per-endpoint banners) became one `info` line per request (method, path, status, duration, cache class, Vercel request ID) plus warnings for backend failures. `console.log` became `logger.debug`, silent in production browsers, which previously printed every one. Values under secret-looking keys (`password`, `pass`, `token`, `authorization`, `cookie`, API keys, email) and email addresses in strings are redacted; long strings, arrays and deep objects are truncated. The monitoring stub, which dropped errors in production, now logs them. Proxy responses carry `x-cache-class`. |

## Step 4 — Minimal typed endpoint list and route tests

1. **A typed endpoint list** (`src/api/endpoints.ts`). Each entry declares its security boundary and behavior:
   `{ key, sport, method, path(params), paramRules, allowedQuery, timeout, cacheClass, passthroughEligible }`.
2. **The proxy reads from the list.** It looks up the endpoint, validates the method, path segments and query parameters, applies the timeout and the cache class's headers, and forwards. This replaces the 950-line switch and the separate allowlist in `shared-request.ts`. The explicit validation stays; no unrestricted rewrites.
3. **Client and server helpers build URLs from the list**, but hooks stay hand-written: many have their own transforms, `select` logic, retry rules and `enabled` conditions. Generating hooks is considered only if a prototype on a few endpoints proves it's simpler.
4. **Contract tests** proving every registered endpoint is accepted by the proxy and that unregistered paths, methods and query parameters are rejected.
5. **Move the 33 raw `fetch()` calls** out of presentation components into shared data modules or hooks.
6. **Validate responses with Zod incrementally.** Start with POST inputs, endpoints known to change, and the shared response envelopes. Measure the cost before validating large historical or chart payloads in production.
7. **Test fixtures.** Small, curated fixtures covering normal and edge cases (empty conference, missing fields, preseason, archived season), served by MSW in unit and Playwright tests. Not large raw captures. MSW proves frontend behavior; the scheduled live check (step 2) proves the backend contract still matches.
8. **Backend contract ownership.** Document in `docs/data-flow.md` which side owns each response shape, how breaking changes to the Flask backend are announced, and how long old fields must keep working.

**Outcome (complete, 2026-09-26), in nine PRs plus the download-button follow-up:**

| Part | What | Result |
|---|---|---|
| 4a (#23) | Typed endpoint list `src/api/endpoints.ts` | 56 endpoints (45 GET, 11 POST), one entry each with key, sport, method, proxy paths (plus older aliases), backend path, a rule per path parameter, allowed query parameters, timeout, cache class, body and response type, `passthroughEligible`. Pure matching helpers (`matchEndpoint`, `buildBackendPath`, `checkQuery`, `endpointForBackendPath`) for the proxy and server fetches. Unit tests prove every GET keeps the cache class step 3b gave it. Three shapes the proxy accepted are left out because the backend has no such route (they could only 404): `team_schedule`, `football/debug/*`, `football/team/*/history/sagarin_rank`. |
| 4b (#24) | The proxy reads the list | The 866-line per-shape switch became a lookup (`src/app/api/proxy/[...slug]/route.ts`, 218 lines, no per-endpoint code). Unregistered paths get 404, wrong methods 405 with `Allow`, bad path or query parameters 400, none reaching the backend. Query parameters are per endpoint and format-checked (all three used to go to every endpoint unchecked). Responses carry `x-endpoint`. **Fixes team pages for names with `&`, `'` or parentheses** (Texas A&M, St. John's, Miami (OH)…), which got a 400 from the old segment regex; `.`/`..` segments are now refused. Server fetches take their cache lifetime from the same entries; `cacheClassForBackendPath` and the client's separate allowlist in `shared-request.ts` are gone. Two dead client methods calling unserved paths removed (`healthCheck`, `getFootballPlayoffs`). The chart page's "download team schedule" button calls `team_schedule`, which the backend never had; it failed before and still does. |
| 4c (#25) | Contract tests | `contract.test.ts` runs every entry through the real route handler on each of its paths (503 cases): accepted and forwarded to the exact backend URL with its allowed query parameters; the other method (405), each unlisted or malformed query parameter, bad path parameters (`..`, `/`, `?`, `#`, `\`, over-long) and extra segments rejected with no backend request; formerly accepted or never-proxied paths 404. `callers.test.ts` parses the source (TypeScript AST) and checks the 97 URLs the site builds (proxy URLs in hooks, components and API clients; backend paths in `server-api.ts`) against the list; a deliberately misspelled entry fails it. The one known unserved call (`team_schedule`, above) is listed explicitly and must be removed from the list once decided. |
| 4d (#26) | Component data reads into hooks | 9 of the 16 component `fetch()` calls (item 5; 33 at the time of the review, 16 by step 2). New hooks: `useFootballBowlPicks` (the bowl table, scoreboard and projection chart share one cached request, now with the `live` class instead of React Query's defaults), `useTeamList` (teams pages and bowl-pick logos; the teams page fetched the whole list again on every conference change and now filters locally), `useBasketballUpcomingGames`, `useBasketballConfChampAnalysis`, `useFootballTeamCFPHistory`. `RawProbabilityScheduleViewer` was deleted: nothing imported it and its route (`/api/basketball/debug/probability-schedule`) never existed. |
| 4e (#27) | Component POSTs into hooks and services; the lint rule becomes an error | The other 7 calls. What-if baseline and validation CSV: `fetchBasketballWhatIfBaseline` / `fetchBasketballWhatIfValidationCsv` next to the what-if mutation in `useBasketballWhatIf.ts`. Next-game impact: `useBasketballNextGameImpact`, a query (the POST only reads), so React Query cancels the previous team's request, replacing a hand-rolled `AbortController`. Scatterplot upload: `src/services/chart-upload.ts` (its own module: importing the API client pushed `/basketball/chart` 22 kB over budget). Football what-if export: `api.exportWhatIfCsv`. Contact form: `src/services/contact.ts`. `csvDownload.ts` was deleted (nothing imported it). ESLint's no-`fetch`-in-components rule is now an **error**: 0 calls left (16 at step 2). |
| Follow-up (#28) | Chart page "Download Team Schedule" works | The button called `team_schedule`, which the backend never served (noted in 4b/4c). The backend now has `GET /basketball/team_schedule/csv` (jthom_prod_backend), returning the schedule table as CSV, which stays well under Vercel's 4.5 MB response limit where JSON might not; the list gained `basketball.teamScheduleCsv`, the proxy passes CSV GETs through with their filename, and the page downloads via `src/services/team-schedule.ts`. `callers.test.ts` has no known-unserved calls left. |
| 4f (#29) | URL helpers built from the list (item 3) | `src/api/urls.ts`: `apiUrl(key, params, query)` / `apiPath(...)` for the browser and `backendRequest(...)` for server fetches. Keys are a typed union (a misspelled key doesn't compile); a missing, unknown or invalid parameter, or a query parameter the endpoint doesn't take, throws. All 94 call sites moved (API clients, 26 hooks, 8 pages, `server-api.ts`); ESLint now rejects importing `proxyUrl` or writing `/api/proxy/…` outside the helpers, which retires the source-scanning `callers.test.ts` in favour of `urls.test.ts` (every entry's built URL is accepted by the proxy). **Server fetches now validate page parameters** before calling the backend: a team name from the URL like `..` or `a/b` used to go straight into the backend path; it is now refused without a request. `server-api.ts` no longer maps backend paths back to endpoints for its cache lifetime; it has the entry. Hooks stay hand-written, as planned. |
| 4g (#30) | Backend contract ownership (item 8) | `docs/data-flow.md` → "Contract with the backend": who owns each part (the frontend owns paths, parameters, POST bodies and cache lifetimes via `src/api/endpoints.ts`; the backend owns response bodies; names follow the stored data, e.g. `Southeastern`), the additive-first rule for shape changes (add alongside, switch the frontend, remove only after the frontend has stopped reading it for 30 days, since cached JavaScript lives that long; archived seasons frozen), how changes are announced (`API:` backend PR titles linked to the frontend PR, merge order), and which checks catch drift. The backend's `CLAUDE.md` points to it. |
| 4h (#31) | Zod validation, incrementally (item 6) | `src/api/schemas.ts`, used by the proxy only (no browser bundle cost). **POST inputs:** all 9 JSON POSTs have a schema; the proxy forwards only the parsed body and answers 400 to anything else, so fields the site never sends are dropped. Among them, `game-impacts` accepted `max_sims` and `force_live`, which let any caller request expensive live simulations. Uploads must contain a file ≤ 2 MB. **Shared envelope:** the ten conference-table GETs are checked against `{ data: [{ team_name, … }], conferences }`; drift is logged (`Backend response doesn't match its schema`) and the response still served. **Measured cost** (`scripts/zod-cost.mjs`, Node 22): the envelope check on the full 365-team table takes 1.9 ms (p50; `JSON.parse` of the same body 2.4 ms), paid only on CDN misses. Validating every field of a season history payload (43,800 points, 5.6 MB) takes 65 ms, 2.4× the parse, so large historical and chart payloads stay unvalidated in production. **Removed from the proxy:** `POST football/bowl-game-winner`, which wrote to the production database without authentication and was never called by the site; the backend now requires an admin token for it and is disabled until one is set (backend #7). |
| 4i (#32) | Test fixtures served by MSW (item 7) | `fixtures/backend/`: six small fixtures (12 kB), five of them real backend responses generated by `scripts/generate-fixtures.py` from the Flask routes and the backend's own test tables, so their shape is the backend's; plus derived scenarios: empty conference, missing fields, preseason zeros, archived season. The same MSW handlers serve them in Jest (`fixtures.test.ts`: every scenario passes the response schemas, flows through the proxy and server fetches, and passes the API client's validators) and to Playwright, where a fixture backend (`e2e/fixture-server.ts`, MSW `getResponse`) replaces the real one via `BACKEND_API_URL`. With data available, the smoke tests now cover the **current-season team pages** (deferred since step 2), and `fixtures.e2e.ts` checks rendered data, the three edge scenarios on both sports' standings, and that archive pages request their season. MSW's ESM-only dependencies are compiled for Jest in `jest.config.js`. Screenshot comparisons move to step 7, where file splits need them and baselines can be generated on the CI runner. |

## Step 5 — Next.js 16 upgrade (isolated migration)

**Consider doing this step next.** Step 2 found that Next.js 14 has no patched release for a series of advisories, including two critical (remote code execution via the Image Optimization API with AVIF, and on Windows-hosted servers) and several high-severity denial-of-service and SSRF issues; fixes exist only in 15.5.24+ and 16. Vercel's hosting mitigates some of them, but not all. Steps 3 and 4 don't depend on the framework version, so reordering costs little.

Done before the route and caching work, because Next 16 changes exactly what those steps touch (async `params`/`searchParams`, the caching model, Turbopack as the default build tool). Doing route work on 14 and then redoing it on 16 would be double work.

1. **Prerequisites.**
   - Node 20.9 or newer: update `engines`, `.nvmrc`, CI, and the Vercel project's Node version setting.
   - Lint already runs through the ESLint CLI (step 1).
2. **Make the async `params` and `searchParams` changes** everywhere. The proxy already uses the async shape; pages and layouts do not.
3. **Replace `next-pwa`.** It is a webpack plugin and won't work with a default Turbopack build. Either move to a maintained replacement such as `@serwist/next`, or pin the build to webpack temporarily and schedule the replacement.
4. **Remove or port the custom dev webpack block** in `next.config.js`, and remove `missingSuspenseWithCSRBailout:false` and `ignoreDeprecations`, fixing whatever they were hiding.
5. **Upgrade React 18 → 19 and ESLint 8 → 9 (flat config only)** in their own PRs after Next 16 is stable, not in the same change.
6. **Revisit caching** under the new framework model and map the step 3 cache classes onto it.
7. **Rollback criteria:** the upgrade PR is reverted if `verify:full` fails, or if Core Web Vitals, bundle sizes or error rates regress beyond agreed thresholds against the step 1 baselines in the first days after deploy.

**Outcome (complete, 2026-09-26), in four PRs:**

| PR | Change | Result |
|---|---|---|
| 5a (#10) | Next.js 14.2 → 16.3.6 | Fixes all Next 14 advisories (2 critical). 30 route files moved to async `params`/`headers()`; archive-season wrappers became server components; `dynamic(..., { ssr: false })` moved into `*ClientOnly` client components; Suspense boundaries added where `missingSuspenseWithCSRBailout: false` had hidden their absence (game preview, football what-if). Shared runtime +35 kB gzipped per route (Next 16/React 19), route code unchanged; budgets re-baselined deliberately. Lighthouse in CI: average 78 → 82 across 7 routes (single runs, within noise). |
| 5b (#12) | ESLint 8 → 9, `eslint-config-next` 16, native flat config | 0 errors. React Compiler rules from `eslint-plugin-react-hooks` 7 (~100 findings) are warnings until steps 7–8. |
| 5c (#13) | React 18 → 19 | One type fix (nullable ref props). Browser bundles unchanged (Next 16 already shipped React 19 to the browser). |
| 5d | `next-pwa` → Serwist (`@serwist/turbopack`); builds move to Turbopack | Same worker URL (`/sw.js`), same behavior (skipWaiting, clientsClaim, images cached 24 h), old caches cleaned up. Precache cut from 630 files (~21 MB, including all of `public/`) to 151 (~1.2 MB transfer). Production build 67 s → 31 s. `npm audit`: **0 known vulnerabilities** (48 before step 2). |

Deferred: React Compiler lint findings (steps 7–8); six Dependabot PRs opened on 2026-09-25 need re-triage now that the framework majors moved.

## Step 6 — Canonical URLs and route migration (SEO and product migration)

1. **Decide and write down the URL policy** (as a decision record) before changing any routes. Proposed default:
   - Current season lives at stable **seasonless URLs** (`/basketball/wins/`), so public URLs don't change every year.
   - Archived seasons live at **season-qualified URLs** (`/basketball/2025-26/wins/`) and stay `noindex`, but gain real server rendering and metadata.
   - Team pages and pages with no season equivalent (game preview, composite ratings, season info) are listed explicitly with their canonical form.
2. **A sport and season config.**
   - `src/config/sports.ts`: labels, colors, which pages exist per sport, endpoint keys. Navigation, sitemap, metadata and the season picker all read from it.
   - `src/config/seasons.ts`: `currentSeason` per sport plus the archive list.
   - This removes the hard-coded `2025-26` strings and the TEMPORARY rewrites. Season rollover becomes a config change plus the `season-rollover` skill.
3. **Migration requirements.**
   - A redirect from every existing route that changes, preserving query parameters (`?conf=`, `?team=` etc.).
   - Correct canonical metadata on every page, and a sitemap generated from the config.
   - Change the root `/` redirect from permanent (308) to temporary (307), or a config-driven landing page, so it can switch between football and basketball by season without browsers caching the old target.
   - Check indexing in Google Search Console before and after.
4. **Rollback criteria:** redirects are kept at least a full season. Roll back if crawl errors or organic traffic to affected pages drop beyond an agreed threshold.

**Outcome (complete, 2026-09-27), in five PRs:**

| Part | What | Result |
|---|---|---|
| 6a (#33) | URL policy decision record (item 1) | `docs/decisions/url-policy.md`, accepted by the owner. Current season at seasonless URLs; archives at `/<sport>/<season>/<page>/`, `noindex` with their own metadata; current-only pages and tools listed; a URL naming the current season 307s to the seasonless page, unknown seasons 404, `/` becomes 307. Seasons per the owner: **2026-27 current for both sports, 2025-26 the one archive of each**. Found that the TEMPORARY basketball rewrites never fired (array-form rewrites run after static pages; checked on a production build), so removing them changes no response. |
| 6b (#34) | Season and sport config (item 2) | `src/config/seasons.ts` (current and archived seasons per sport, home sport) and `src/config/sports.ts` (each sport's pages: nav tab, archive version, indexed, sitemap entry). Navigation, the sitemap, the archived-season cache rule and the smoke-test route list read them; a unit test checks the config against the route folders. No URL changes (sitemap: same 29 pages). Archive-mode nav no longer links current-only pages to a 404. Basketball 2025-26 is now cached as `historical`. `season-rollover` is a config change. |
| 6c (#35) | Page metadata from the config (item 3, canonicals) | Titles and descriptions moved into `src/config/sports.ts` (text unchanged); `sportPageMetadata` / `teamPageMetadata` give every page a self-referential canonical. The 25 archive pages, which had no metadata of their own, get the season in title and description, a self-canonical and `noindex`. `/basketball/game-preview/` (in the sitemap without title or canonical) gets both. `composite-ratings` joins the sitemap. Smoke tests check every page's canonical and robots tag. No URL changes. |
| 6d (#36) | Route migration (item 3, redirects) | `/<sport>/<current-season>/...` 307s to the seasonless URL in one hop (trailing slash and query string kept), built from the season config in `next.config.ts` (was `.js`). Seasons not in the config 404 (`[season]/layout.tsx`; they used to render a broken archive page). The TEMPORARY basketball rewrites are gone (they never fired). `e2e/redirects.e2e.ts` covers status, `Location`, query, archive 200s and the 404s. Search Console baseline recorded by the owner before merge. |
| 6e (#37) | Root redirect (item 3) | `/` is now a temporary (307) redirect to `/<HOME_SPORT>/wins/`, read from `src/config/seasons.ts`, so the front page can switch sports without browsers keeping the old target. Browsers that already cached the old 308 keep it until their cache expires; that only matters once `HOME_SPORT` changes. |

Still open: re-check Search Console about two weeks after 6d (around 2026-10-11) against the baseline in `docs/baselines/README.md`; roll back per item 4 if crawl errors or organic traffic to affected pages drop. Keep the 6d redirects at least a full season.

Search Console review (2026-09-28, per-URL exports from before 6d, summarized in `docs/baselines/README.md`): Google knew none of the URLs whose response 6d changed (no `2026-27`, unknown-season or archive URLs in any report or in Performance), and no top-traffic page is affected. It did find problems step 6 didn't cause: 109 sitemap URLs not indexed (93 team pages, 16 pages including `/basketball/wins/`), with Google choosing an unrelated site as canonical for at least one team page, and `?conf=` views indexed in place of their page; plus one sitemap team page that 404s (West Florida). Fixes, one PR each: the baseline itself (#39); West Florida's team page (backend jthom_prod_backend #9: a team missing from `bball_league_hierarchy_flat` got a null logo and a 500; now `default.png`); team URLs whose name has a period now 308 to the trailing slash instead of serving 200 without it (#40, `src/proxy.ts`, smoke-tested). Left to the owner in Search Console: request indexing for top team and main pages, validate "Duplicate without user-selected canonical", remove the duplicate apex sitemap. Main pages losing to their `?conf=` views is left to step 9 (conference URLs).

## Step 7 — Split oversized files without changing behavior

1. Split the largest files (game preview, what-if scenarios, non-conference analysis, wins breakdown, the schedule-difficulty and compare-schedules charts) into feature folders: `features/game-preview/{data.ts, hooks.ts, sections/*.tsx}`.
2. **Behavior-preserving only.** No visual or logic changes in these PRs. Each PR is verified with Playwright screenshot comparisons of the affected routes against fixtures.
3. Replace the 16 hand-rolled resize hooks with `useResponsive` as files are split.

**Outcome (complete 2026-09-29):**

| Part | What | Result |
|---|---|---|
| 7a (#42) | Screenshot comparison (item 2) | `npm run visual:compare` builds the base branch in a temporary worktree and this checkout, shoots the routes in `e2e/visual.e2e.ts` on desktop and mobile against the fixtures, and fails on more than 20 differing pixels per page. Nothing committed; CI runs it on every PR (`Visual` job). Making it deterministic took: warm font cache (`font-display: optional`), empty 200s for endpoints without fixtures (hooks retry 404s), one tall viewport set before load (full-page shots resized charts mid-capture), waiting for Chart.js animation and `animate-pulse` skeletons, one worker. Passed 3 CI runs in a row on identical code; a one-word change fails. |
| 7b (#43) | `BasketballTeamScheduleDifficulty` (958 lines) | `features/basketball/team-schedule-difficulty/`: `types`, `constants`, `data` (pure maths, 12 unit tests), `FilterGroup`, `DifficultyChart`, `StatsSummary`, `index`. Screenshots identical. |
| 7c (#45) | `FootballTeamScheduleDifficulty` (996 lines) | `features/football/team-schedule-difficulty/`, same shape plus `GameTooltip` (was defined inside render); 11 unit tests. Kept separate from basketball: they have drifted (threshold split, location filter, 4 vs 2 logo columns); merging is step 8. Screenshots identical. |
| 7d (#46) | `BasketballTeamWinsBreakdown` (1,515 lines) | `features/basketball/team-wins-breakdown/`: `data` (9 unit tests), `SeedRegions`, `WinsBar`, `ProjectedWinsMarker`, `GameRow` (the win and remaining-game rows were two ~190-line copies), `ColumnHeaders`, `ChartFooter`, `index`. New fixture `basketball.confChampAnalysis` (production ACC response) so the Duke page is compared with the seed map drawn. Screenshots identical. |
| 7e (#47) | `BasketballCompareSchedulesChart` (1,240 lines) | `features/basketball/compare-schedules/`: `data` (10 unit tests), `FilterGroup`, `PercentileGrid`, `TeamColumn` (was the inner `renderTeamColumn`), `HighProbSection`, `GameTooltip`, `Legend`, `index`. Visual routes can now run `setup` steps; both compare pages are shot with a team picked. #47 also carried the 7c/7d rows of this table. Screenshots identical. |
| 7f (#48) | `FootballCompareSchedulesChart` (920 lines) | `features/football/compare-schedules/`, reusing `football/team-schedule-difficulty/FilterGroup` (identical markup); a `logger.debug` dump effect removed; 8 unit tests. Screenshots identical. |
| 7g (#50) | `BballNonConfAnalysisTable` (1,684 lines) | `features/basketball/nonconf-analysis/`: `data` (unit-tested), `HeaderRows`, `Rows`, `index`. New fixtures `basketball.conferenceData` and `basketball.nonconfAnalysis`; `/basketball/conf-data/` is shot with the ACC row opened (picked by logo, since mobile hides the name). Screenshots identical. |
| 7h (#51) | `BasketballWhatIfScenarios` (1,774 lines) | `features/basketball/whatif/`: `ProbabilityTable`, `FullStandingsTable`, `ResultsPanel`, `TeamFilterDropdown`, `index`; its CSS module moved in. Fixture `basketball.whatIfBaseline` (trimmed production response); the fixture backend now serves POST endpoints. Screenshots identical. |
| 7i (#52) | `FootballWhatIfContent` (1,123 lines) | `features/football/whatif/`: `data`, `structuredData`, `GameTile`, `SelectionSummary`, `ResultsCard`, `index`; the page imports the folder. The CSV download fetch moved into `useFootballWhatIf` (components may not call `fetch`). Fixtures `football.whatIf` and `football.conferenceData`. Screenshots identical. |
| #53, #54 | Screenshot harness | Images load eagerly and are waited for (a lazy logo sometimes never started); one reload if a skeleton stays up; an image that never finishes is logged instead of failing the run; service workers blocked. |
| 7j (#55) | Game preview page (3,907 lines in `page.tsx`) | `page.tsx` is now a Suspense wrapper around `features/basketball/game-preview/`: `hooks`, `metrics`, `narratives/*`, `sections/*`, `pdf`; types in `src/types/gamePreview.ts`, fetches in `src/services/game-preview.ts`. Fixtures `basketball.upcomingGames` and `basketball.nextGameImpact`; shot at `?game=fixture-1`. Screenshots identical. |
| 7k (#56) | Game preview component (1,617 lines after 7j) | Split by PDF page: `pages/HeaderPage`, `pages/ImpactPage`, `pages/SchedulePage`; `index.tsx` is 533 lines. Screenshots identical. |
| 7l (#57) | Item 3: resize hooks | The remaining width checks (the three `Bball*` seed/ceiling charts, game preview, both schedule-difficulty charts, wins breakdown) use `useResponsive`, each keeping its own cutoff (`< 768` or `<= 768`) and the desktop layout until hydrated. Earlier parts replaced the rest as their files were split. No `window` resize listeners remain outside `useResponsive`; what is left is `ResizeObserver`s that measure a chart's own box and `innerWidth` reads that keep hover tooltips on screen. Screenshots identical. |
| #59 | Screenshot harness | `/_next/image` requests are answered by the test itself: the file from the shot build's `public/`, scaled to the requested width with sharp. In CI the optimizer sometimes didn't answer a logo within 30 s, and unscaled originals (up to 3,840 px, shown at 28 px) were sometimes not yet painted (Big South on conf-data mobile: 3 of 6 local repeats failed, 8 of 8 passed once scaled). Images that finish without data are loaded once more, and all are decoded before the shot. The game-preview route picks `fixture-1` in the picker when the page's URL race (below) drops it. |

Found while splitting, deliberately not fixed here (behavior-preserving scope; each needs its own PR with the owner's OK):

- **Game preview picker is empty in production.** The page filters `/basketball/upcoming_games` by `is_next_game_for_both` and selects by `game_id`, and the backend sends neither, so it shows "0 upcoming". The visual fixture is hand-shaped with both fields. **Fixed** in backend #11 (both fields added); games show in production (owner, 2026-10-01).
- **Game preview `?game=` race.** When the games load, the URL-sync effect still sees no selection and strips `game` from the URL in the same commit as the auto-select, so a shared link can open with nothing selected. CI's Visual job hit it on the base build of #57 and #58; since #59 the screenshot test picks the game itself when this happens, so the harness no longer depends on it. **Fixed** in #77: the URL is read once, during render, and written back only after that, so `?game=` survives the load and clearing the dropdown no longer snaps back to the URL's game (5 unit tests; the two race tests fail on the old code).

## Step 8 — Merge proven duplicates behind shared building blocks

1. **Hybrid structure:** shared feature building blocks (e.g. a `HistoryLineChart` shell taking `{ data, seriesConfig, sportTheme }`) plus thin basketball and football adapters.
2. **Start with the near-copies** measured above (StandingsHistory, FirstPlace, ConfBids, ConfChampion history charts), one pair per PR, each screenshot-verified in both sports.
3. **Don't force sport-specific rules into shared abstractions** just to reduce line count. Pairs that differ substantially (e.g. schedule difficulty, compare schedules, where over half the lines differ) stay separate unless a clear shared core emerges.
4. **Consolidate export code:** `export-image`, `save-image`, `optimized-screenshot`, `download-compare-chart` and `screenshot-layout` into one export module.
5. **Rollback criteria:** any visual difference not explicitly intended blocks the PR; a chart merge is reverted if a sport-specific regression appears after deploy.

**Outcome so far:**

| Part | What | Result |
|---|---|---|
| 8a (#62) | Standings history charts (`BballStandingsHistoryChart`, `FootballStandingsHistoryChart`; 63 of ~700 lines differed, mostly comments) | Shell in `features/shared/standings-history/`: `index` (chart), `EndMarkers` (end-of-line dots, logos, values; §8g), `hoverLens` (plugin built with an id), `types`. Each sport keeps a ~20-line adapter passing a `StandingsHistoryTheme`: date-range function, tooltip and lens ids (unchanged), and the end-label class (football's values sit 3px higher; kept per sport, unifying it would be a visible change). New hand-shaped fixtures `basketball.standingsHistory` and `football.standingsHistory` (2025-26 dates, `timeline_data` and `first_place_data`); `/basketball/2025-26/standings/` and `/football/2025-26/standings/` added to the visual routes, since the axis runs to today and the archive season keeps it fixed. Before this, the standings shots compared empty history charts. Screenshots identical. |
| 8b (#64) | First-place history charts (`BballFirstPlaceHistoryChart`, `FootballFirstPlaceChart`; 185 lines differed) | Shell in `features/shared/first-place-history/`: `index`, `data` (tooltip rows and end-logo layout, 6 unit tests), `types`. The theme carries what had drifted: percent format (`62.0%` vs `62%`), tooltip rows (every row vs teams above 0%), right padding (76/70), logo spacing (24/28 vs 21/25), end-label class, screen-reader label, empty-state layout; unifying any of them is a visible change for its own PR. The card class, hover lens and a `useIsDark` hook, identical in both pairs, moved to `features/shared/history-chart/` and 8a uses them too. Covered by the 8a fixtures and routes; tooltip and empty state (not in the shots) by the unit tests. Screenshots identical. |
| 8c (#66) | Conference bids history charts (`BballConfBidsHistoryChart` NCAA bids, `FootballConfBidsHistoryChart` CFP bids; 192 lines differed) | Shell in `features/shared/conf-bids-history/`: `index`, `ConferenceChips`, `data` (FCS filter, version dedupe, end-logo layout; 5 unit tests), `types`; reuses `history-chart/`. The football adapter maps `conference_name`/`conf_info` to the shell's `conference`/`conference_info` (memoized); its FCS filter and dedupe run as the theme's `prepareRows`, after the no-history check as before. Theme: copy, end-logo threshold (>= 1.1 vs > 0.3 bids), logo spacing (18/28), end-label spacing. New hand-shaped fixtures `basketball.conferenceDataHistory` and `football.conferenceDataHistory` (football has an FCS row and a later-version duplicate); both `2025-26/conf-data` archive pages added to the visual routes. First CI Visual run failed once on basketball mobile (783 px, base and retry alike), not reproducible locally (12/12) and green after #67 with identical chart code; read as a bad base reference shot. |
| #67 | Screenshot harness | A failed shot logs a `[visual]` line with the bounding box of the differing pixels and the elements at its centre, since the `visual-diff` artifact can't be downloaded from agent sessions. |
| 8d (#69) | Conference-champion and championship-game charts (`BasketballConfChampionHistoryChart`, `FootballConfChampionHistoryChart`, `FootballChampGameHistoryChart`) | Owner's decision: folded into the 8b shell as adapters instead of a new pair, since each was closest to its own sport's first-place chart (89, 99 and 186 lines vs 317 between the two ConfChampion charts). `first-place-history/` renamed `probability-history/`; five adapters keep their names and props. New theme settings, each reproducing the old chart: `valueKey`, copy, `lensPluginId: null` (basketball champion had no lens), unnumbered tooltip rows, `logoLayout: "cascade"` (the football champion charts' layout, ported exactly, including spreading logos bunched at the top), a card-less empty state, logo spacing. 4 new unit tests. Fixtures: `football.standingsHistory` gains `champion_data` and `champ_game_data`; new `basketball.confTourneyHistory`. `/basketball/2025-26/conf-tourney/` and `/football/2025-26/conf-champ/` added to the visual routes (before, all three charts were only compared empty). Screenshots identical. |
| #70 | Screenshot harness | Three flakes fixed: the web font is waited for (`font-display: block` in the shot's CSS; a fallback-font render changed wrapping), logos loaded straight from `public/images/` are scaled like `/_next/image` ones (an unpainted 1,000+ px logo), and the page is scrolled to the top before the shot (a 2 px scroll shifted everything below the sticky header). |
| #71 | Download checks (before item 4) | `DOWNLOAD_ROUTES`: 6 checks click a Download or Screenshot button and compare the saved PNG with the base branch's (desktop; html2canvas served from `node_modules`). Covers `TableActionButtons`, both compare pages, the what-if tables and `ScreenshotModal`; not the game preview PDF, `/basketball/chart/`, `NextGameImpact` or `WhatIfTeamSummary`. |
| #72 | Lighthouse gate | Relaunches Chrome and retries a page once when Lighthouse loses its connection (`ECONNREFUSED` on the debugging port aborted the whole gate before any audit). |
| #73 | Screenshot harness | Comparisons run Chrome with `--disable-font-subpixel-positioning`. The same build drew canvas text in one of two ways from identical calls (conf-champ mobile, 220 px, 4 of 10 loads); with the flag 10 of 10 were identical. A rarer flake remains: the sticky "Power Conf Opponents" header text on `basketball-conf-data-ACC` (mobile) sometimes 1 px lower (1 of 3 full repeats), under investigation. |
| #74 | Item 4: dead code | `src/lib/optimized-screenshot.ts` deleted (509 lines, no importers). |
| #76 | Item 4: one export module | `export-image`, `save-image`, `screenshot-layout` and `download-compare-chart` moved to `src/lib/export/` (`capture`, `save`, `layout`, `compare-chart`); renames and import lines only. |
| #78, #80, #82 | Item 4: one html2canvas loader | Eight call sites drop their own copy of the CDN loader for `ensureHtml2Canvas()` from `capture.ts`: `TableActionButtons`, `ScreenshotModal`, the what-if screenshot, both basketball compare pages, `NextGameImpact`, `WhatIfTeamSummary` and `/basketball/chart/` (which still preloads it). Each batch verified by the download checks; duplicate `window.html2canvas` declarations removed. |
| #81 | Download checks | `NextGameImpact`, `WhatIfTeamSummary` (after a calculation, answered by the baseline fixture) and `/basketball/chart/` (a CSV upload answered by the hand-written `basketball.chartUpload` fixture); #80 added the archive compare page. Only the game preview PDF is unchecked (it is a PDF, not a PNG). Noticed, not changed: the chart export's axis tick labels overlap into an unreadable band (a visible fix for its own PR). |
| #77 | Game preview `?game=` race | See "Found while splitting" under step 7. |
| #79 | Screenshot harness | Sticky elements are made static before page shots (nothing is scrolled, so none moves): sticky header text was sometimes drawn 1 px lower on mobile (`basketball-conf-data-ACC`, 1 of 25 loads; 0 of 50 with this). |
| #84 | Chart page axis ticks (owner-approved visible fix) | `/basketball/chart/` defaulted to a tick every 0.1, about 340 overlapping labels per axis on ratings data. The interval now comes from the data (about 6 ticks, steps of 1/2/5), the settings show it, and an interval over 40 ticks is replaced when drawn (`basketball/scatterplotAxis.ts`, 12 tests). Visual failed only on `download-basketball-chart`, as intended; merged with the owner's OK. Not changed (owner: no): the scatterplot is wider than a phone screen. |

All four near-copy groups are merged. Within one sport the standings and first-place charts differ by 265 lines, so there is no single generic history chart: shared pieces live in `features/shared/history-chart/` (card, hover lens, dark-mode hook). Presentation settings that drifted between sports (percent format, tooltip rows, padding, logo spacing, end-label offsets) are kept per sport in the themes; unifying any of them is a visible change for its own PR, with the owner's OK.

Item 4 (export code), as agreed with the owner: download checks first (#71, #81), then delete the unused `optimized-screenshot.ts` (#74), move the rest into `src/lib/export/` (#76) and give the call sites one html2canvas loader, a few per PR (#78, #80, #82). Left as is, by the owner's decision (2026-10-01): the game preview PDF (`game-preview/pdf.ts`) keeps its own loader and has no check.

## Step 9 — Measured performance work

Each item is benchmarked against the step 1 baselines and kept only if it improves them.

The step 1 baselines show the site is already fast for most visitors (Real Experience Score 100 on desktop and mobile, P75 LCP 1.2–1.5 s), so this step targets the specific weak pages rather than a site-wide push:

- `/football/seed` on desktop (field score 47, while mobile scores 100, so the cause is desktop-specific).
- Archive pages such as `/football/2025-26/wins/` (slowest in the lab at LCP 4.2 s, the only tested page with layout shift; fully client-rendered).
- `/basketball/compare/` (235 requests per load, highest blocking time), `/football/compare` (desktop field score 59).
- Team pages (10 proxy calls per load) and `/football/twv` on mobile (field score 85).

1. **Static generation, benchmarked first.** Compare three options on SEO needs, build duration, request volume, staleness and runtime performance:
   1. Query-string routes (`?conf=`) with cached server data.
   2. Conference in the path, generated on demand with revalidation.
   3. Conference in the path, fully pre-built at build time.
2. **Server Components by default.** 191 files are `"use client"`. Fetch on the server and pass `initialData` down (already done on some pages), keeping only interactive parts client-side. Priorities: game preview and archive pages.
3. **Load heavy libraries only where used.** Lazy-load Chart.js chart components with `next/dynamic` and a skeleton, registering only the Chart.js pieces each chart needs. Load `html2canvas` only when the user exports (and move it from devDependencies to dependencies, since it runs in the browser).
4. **Proxy speed with the security boundary intact.** Stream backend responses straight through instead of the `text()` → `JSON.parse` → re-serialize round trip. Consider the Edge runtime for endpoints marked `passthroughEligible`, keeping the same validation. No unrestricted rewrites.
5. **Service worker scope.** Cache static assets only. Do not broadly cache `/api/proxy/*`. If offline analytics becomes a product requirement, opt individual endpoints in and show data freshness to users. Remove the dead rule pointing at the wrong backend host.
6. **Remove shipped debug code:** `PerformancePanel` and React Query Devtools in dev only.

**Outcome so far:**

| Item | What | Result |
|---|---|---|
| 9a (#86) | Measurement | `scripts/lighthouse-baseline.mjs` takes `--routes`, `--add-routes` and `--preset desktop`, and records requests by type and host. The Production baseline workflow adds `/football/seed/`, `/football/compare/` and `/football/twv/` on mobile and a desktop pass (seed, compare, wins). First numbers: `docs/baselines/README.md`, 2026-10-01. On desktop the lab scores `/football/seed/` 100 (LCP 0.5 s, CLS 0), so its field score of 47 (36 visits) doesn't reproduce in the lab. |
| 9b (#87) | Archive pilot: `/football/2025-26/wins/` | The page fetches the Big 12 standings for its season on the server and passes them as `initialData`; `WinsContent` applies `initialData` for the default conference whatever the season (only the page's own season is ever passed). Basketball's archive wins page passes none, unchanged. New e2e check that the HTML has the table and the server asked for `?season=2025-26`; both football wins pages added to the visual routes. Screenshots identical. Before: proxy calls 1, LCP 2.8–4.4 s, CLS 0–0.21, performance 65–73 (09-28 to 10-01); after: pending the daily runs. |
| 9c (#89) | Layout shift on the football wins pages | Cause: `FootballBoxWhiskerChart` drew the generic `BoxWhiskerChartSkeleton` (380/480 px) until mounted, then its 526/617 px card, so everything below moved about 140 px; on mobile the server rendered the desktop layout, so the explainer row reflowed after hydration; and the archive page had no `<Suspense>` around `WinsContent` (`useSearchParams()`), so the browser client-rendered it and showed the dynamic import's skeleton again. Fix: the chart draws its own titled card at its final height before mount (dark-mode colors still wait for mount); both wins pages read the device from the User-Agent (`ResponsiveProvider`, as `/football/standings/` does); the archive page gets the `<Suspense>` boundary. Lab CLS (fixtures): `/football/wins/` 0.093 → 0 mobile, 0.023 → 0 desktop; `/football/2025-26/wins/` 0.093 → 0 and 0.019–0.023 → 0. New `e2e/layout-shift.e2e.ts` (CLS < 0.01 on both pages) fails on the old code with those values. Only the loading state looks different; screenshots identical. Production: pending the daily runs (09-28 to 10-01: 0.09–0.10). Local note: a `.next/cache/fetch-cache` left by earlier runs can answer #87's server-fetch check from cache and fail it; CI starts clean. |
| 9d (#91) | Layout shift on `/basketball/wins/` | Same cause and fix as 9c: `BoxWhiskerChart` draws its own titled card at its final height before mount, and the page reads the device from the User-Agent. Lab CLS 0.095 → 0 mobile, 0.023 → 0 desktop; `/basketball/wins/` added to the layout-shift test and the visual routes. Screenshots identical. Not changed: `/basketball/<season>/wins/` (desktop 0.075, mobile 0) still loads its data in the browser; giving it the provider and `<Suspense>` alone made mobile worse (0.146), so it waits for the archive pilot. |
| 9e (#93) | Header link prefetches | The 44–49 `Fetch` requests per page (0–1 of them to `/api/proxy`) were Next.js router prefetches of the header's 14 tabs, sport switch and logo, each up to three times as the header's state settled: 43 per load, desktop and mobile. Every page is `force-dynamic` and none has a `loading.tsx`, so a prefetch couldn't render anything sooner; each was a server request. `prefetch={false}` on those links: 43 → 0 per load; tab click to rendered table unchanged (160–290 ms before, 140–310 ms after, local build). `e2e/nav-prefetch.e2e.ts` checks no prefetch on load and that a tab still navigates. Production `requestsByType.Fetch`: pending the daily runs. |
| 9f (#95) | Basketball compare logos | The team picker, search results and selected-team chips drew each logo `unoptimized`: the original ~500 px file (376 files, median 30 kB, max 650 kB) for a 32 px button, about 183 per visit in production (~6–7 MB). `sizes` (40/24/16 px) through the optimizer instead, as `TeamLogo` does: a 48 px AVIF of about 1 kB (North Carolina 29 → 1.2 kB). Both basketball compare pages. `e2e/compare-logos.e2e.ts` checks the picker logos come from `/_next/image/`. A local before/after screenshot of the picker differed by 2,443 px, but the Visual check passed: its harness already scales logos from `public/images/` like `/_next/image` ones (#70). Production bytes: pending the daily runs. |
| 9g (#97) | Football compare logos | Same change as 9f on `/football/compare/` (picker, search results, chips: `sizes` 40/24/16 px instead of `unoptimized`); `e2e/compare-logos.e2e.ts` covers it. Not changed: `/football/<season>/compare/` draws logos with plain `<img>`, a markup change for its own PR. Screenshots identical. |
| 9h (#99) | Conference logos | `TeamContent` (every team page), the conf-bids-history chips and the chart's end labels drew conference logos `unoptimized` (34 files, 3 MB, up to 268 kB). Through the optimizer instead. The team page header shows its logo at a fixed height and its own width (up to 4.7:1), so it also sets `sizes` to that width. Without it the Visual check showed a blurry ACC logo. Conference logo bytes: Alabama 266 → 5.6 kB desktop / 12.1 kB mobile; basketball conf-data 80 → 23 kB. `e2e/conference-logos.e2e.ts` checks no originals and the header's requested width. Visual check red on 8 shots, merged with the owner's OK: every differing pixel is inside a logo box. The harness scales direct `/images/` files to 128 px but optimizer ones to the requested width, so it can't show resized logos as identical (the 9f note overstated it: in #99 the square logos came out identical and only wide ones, such as ACC and Big East, differed, which likely explains why the team-logo PRs #95 and #97 passed). That 128 px rounding also narrows ACC by 2 px in the base shot only. |
| 9i (#102) | Team page chart logos | The team pages' charts drew opponent logos with a plain `<img>` or SVG `<image>` (the original ~500 px file for 24–32 px). New `src/lib/logo-src.ts` `resizedLogoSrc(src, px)` returns the optimizer URL `next/image` would use (the 2× file); used in the wins breakdown, seed ceiling/floor and schedule difficulty (both sports), all drawn in square boxes. Logo bytes with fixtures: Duke 30 → 2 kB desktop, 31 → 5 kB mobile; Alabama 15 → 3 kB (production pages draw ~30 opponent logos, so more there). `e2e/team-page-logos.e2e.ts` checks no originals on either team page. Screenshots identical. Fixes found on the way, each in its own PR: #101 (the #99 width test measured the header before it settled), #103 (a failed Visual comparison now logs the differing box and a before/after crop, since agent sessions can't download the artifact), #104 (image exports kept `srcset` when inlining a logo, so they drew whichever cached optimizer file the browser picked; `setInlinedSrc` removes `srcset`/`sizes`. Merged with one export's logos slightly sharper, 3,651 px inside two logo boxes, under the owner's rule). |
| 9j (#106) | Football archive compare logos | The team picker (32 px) and selected-team chips (24 px) on `/football/<season>/compare/` used a plain `<img>` of the original file; now `resizedLogoSrc`. Fixtures (3 teams): 14 → 1 kB desktop, 6 → 2 kB mobile (a production conference is ~14 teams). `resizedLogoSrc` now builds the optimizer URL itself: `getImageProps` added ~3 kB and put this page over its JS budget (187.3 > 184.4 kB). Its test checks the URL against `getImageProps` and the widths and trailing slash against `next.config.ts`. `e2e/compare-logos.e2e.ts` covers the page. Screenshots identical. |

## Step 10 — Ongoing cleanup (as pages are touched)

1. **Styling.** Turn the modernization guide's card, table and chart styles into Tailwind components and tokens (`design-system.ts` plus `tailwind.config.ts`). Prioritize repeated and responsive inline styles; dynamic Chart.js geometry, computed colors and CSS custom properties may stay inline. Remove `supress-errors.css`, which hides CSS problems rather than fixing them.
2. **Loading, empty, partial-data and error states.** One consistent pattern (shared skeletons, empty-state and error components with retry, a partial-data banner) applied as each page is modernized.
3. **Accessibility regression tests.** Automated checks (e.g. axe via Playwright) plus keyboard and focus tests for tables, charts (text alternatives), conference/team selectors, modals and navigation.
4. **Security and infrastructure.**
   - Contact-form rate limiting: the in-memory Map doesn't work on serverless because each instance has its own. Move it to Upstash/Vercel KV, or rely on Vercel's firewall.
   - Add a Content-Security-Policy. Drop the deprecated `X-XSS-Protection` header and the duplicate header `<meta>` tags in `layout.tsx`.
   - A `/api/health` endpoint for monitoring.

---

## Rollback criteria (summary)

| Change | Roll back if |
|---|---|
| Next 16 / React 19 / ESLint 9 upgrades | `verify:full` fails, or Core Web Vitals, bundle size or error rates regress past thresholds against baselines |
| Route and URL migration | Crawl errors rise or organic traffic to affected pages drops past threshold; redirects kept at least one full season |
| PWA replacement | Service worker errors, stale content served, or install/offline regressions |
| Chart and component merges | Any unintended visual difference, or a sport-specific regression after deploy |
| Caching changes | Stale data visible beyond its class's freshness window, or backend request volume rises unexpectedly |

## How to run this with agents

- **One PR per item**, each ending with `npm run verify` locally and `verify:full` in CI, plus Playwright screenshots of the affected routes (Chromium is preinstalled in cloud sessions).
- **No large rewrite PRs.** Upgrades, URL changes, file splits and duplicate merges never share a PR.
- **Every performance PR states its before/after numbers** against the step 1 baselines.
- **Decisions that affect users** (URL policy, offline support, cache freshness per class) are recorded in `docs/decisions/` before implementation.
