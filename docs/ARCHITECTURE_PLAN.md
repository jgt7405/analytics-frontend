# Refactor plan: make the site easier for agents to maintain, and faster

Status: **steps 1 and 2 complete** (2026-09-25). Baselines are in `docs/baselines/README.md`. **Security note:** Next.js 14 has unpatched advisories (2 critical); consider doing step 5 next, before steps 3–4 (see step 5).

Revision 2 (2026-09-25): folds in feedback from an external review of revision 1 (Architecture Plan Review) plus follow-up adjustments. Findings reflect the
codebase as of 2026-09-25.

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
| Boundaries and lint | Basketball ↔ football imports are an ESLint error (no current violations). Direct `fetch` in components warns (16). Files over 600 lines warn (30). `no-explicit-any` is an error for changed files via `npm run lint:changed`. `no-console` waits for the step 3 logger. |
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

## Step 7 — Split oversized files without changing behavior

1. Split the largest files (game preview, what-if scenarios, non-conference analysis, wins breakdown, the schedule-difficulty and compare-schedules charts) into feature folders: `features/game-preview/{data.ts, hooks.ts, sections/*.tsx}`.
2. **Behavior-preserving only.** No visual or logic changes in these PRs. Each PR is verified with Playwright screenshot comparisons of the affected routes against fixtures.
3. Replace the 16 hand-rolled resize hooks with `useResponsive` as files are split.

## Step 8 — Merge proven duplicates behind shared building blocks

1. **Hybrid structure:** shared feature building blocks (e.g. a `HistoryLineChart` shell taking `{ data, seriesConfig, sportTheme }`) plus thin basketball and football adapters.
2. **Start with the near-copies** measured above (StandingsHistory, FirstPlace, ConfBids, ConfChampion history charts), one pair per PR, each screenshot-verified in both sports.
3. **Don't force sport-specific rules into shared abstractions** just to reduce line count. Pairs that differ substantially (e.g. schedule difficulty, compare schedules, where over half the lines differ) stay separate unless a clear shared core emerges.
4. **Consolidate export code:** `export-image`, `save-image`, `optimized-screenshot`, `download-compare-chart` and `screenshot-layout` into one export module.
5. **Rollback criteria:** any visual difference not explicitly intended blocks the PR; a chart merge is reverted if a sport-specific regression appears after deploy.

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
