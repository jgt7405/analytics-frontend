# Refactor plan: make the site easier for agents to maintain, and faster

Status: **proposed — not started.** Findings reflect the codebase as of 2026-09-25.

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
| **Committed junk** | `build.log`, `dev.log`, `build_output.txt`, and the generated `public/sw.js` and `workbox-*.js` are checked in. | Noisy diffs, and generated files get edited by mistake. |

---

## Phase 0 — Guardrails for agents (do first; low risk, biggest payoff)

1. **One verify command.** Add `npm run verify` = lint + type-check + test + build. It becomes the "done" check agents run before every commit.
2. **GitHub Actions CI.**
   - Run `verify` on every PR.
   - Add a bundle-size budget (e.g. `size-limit` or a script that parses the build output) so size regressions fail visibly.
   - Run Lighthouse CI for real; it's configured in `package.json` today but nothing executes it.
3. **Session setup hook.** Add a SessionStart hook (`.claude/settings.json`) that runs `npm ci`, so cloud agent sessions can run lint, tests and build straight away. There are no `node_modules` in a fresh container right now.
4. **Rewrite the docs.**
   - Fix `CLAUDE.md` (Chart.js, real env vars, real routes, the actual data flow).
   - Move the root `.md` files into `docs/`: `architecture.md`, `data-flow.md`, `design-system.md` (from PAGE_MODERNIZATION_GUIDE), and `docs/decisions/` for the ARCHIVE/WIN_VALUES write-ups.
   - Add short per-folder `CLAUDE.md` files in `src/app/`, `src/components/features/` and `src/services/`, stating local conventions ("new endpoints go in X", "charts use Y").
5. **Step-by-step guides as Claude skills** (`.claude/skills/`):
   - `add-endpoint`
   - `add-page`
   - `season-rollover`
   - `modernize-page` (condensed from the 69 KB guide)
   - `verify-visually` (Playwright screenshots)

   These turn repeated tasks into checklists an agent follows.
6. **Clean the repo.** Remove the logs and generated service-worker files from git and add them to `.gitignore`. Replace the template README.
7. **Lint rules that enforce the architecture.**
   - `max-lines` of about 600, as a warning at first.
   - `no-restricted-imports` so components can't call `fetch` directly and `app/` can't import one sport's code from the other's.
   - `no-console`, allowing only a logger.
   - Raise `no-explicit-any` to an error for new files.

## Phase 1 — One place to define each endpoint

1. **A single endpoint list.** Create `src/api/endpoints.ts` with one typed entry per endpoint: `{ key, sport, path(params), querySchema, responseSchema (Zod), revalidate }`. Everything else is built from it:
   - The proxy becomes about 60 lines: look up the endpoint by key, check the path segments, forward. This deletes the 950-line switch and the separate allowlist.
   - Generated client methods and React Query hooks.
   - The server fetchers in `server-api.ts`, fed the same schema.
2. **Validate responses at the boundary.** Zod checks catch backend changes early. Log failures in dev and report them through monitoring in prod. This replaces the proxy's ad-hoc logging of individual fields.
3. **A query-key factory** (`queryKeys.football.standings(conf, season)`) and one shared cache-timing config, so the React Query, Vercel CDN and server caches agree.
4. **Remove the 33 raw `fetch()` calls** from components and route them through the endpoint list.
5. **Recorded backend fixtures plus a mock server.** Capture real backend responses into `fixtures/` and serve them with MSW. Tests and agents can then run the whole site offline and get the same results every time. This is the biggest help for autonomous agent work.
6. **One env var** (`BACKEND_API_URL`, server-only), read through a validated `src/config/env.ts`.

## Phase 2 — Sport and season as config, not copies

1. **A sport config file** (`src/config/sports.ts`) holding each sport's labels, colors, which pages exist, and its endpoint keys. Navigation, the sitemap, metadata and the season picker all read from it.
2. **A season config** (`seasons.ts`) with `currentSeason` per sport and an archive list. This deletes the hard-coded `2025-26` strings and the TEMPORARY rewrites. Season rollover becomes a one-line change plus the `season-rollover` skill.
3. **Unify routes.** Make `/[sport]/[season]/[page]` the canonical route family, with server-rendered pages. Plain URLs such as `/basketball/wins/` resolve to the current season in shared page code. Archive pages keep `noindex` but gain real server-side rendering.
4. **Use a temporary redirect for `/`.** It's currently a permanent redirect to `/football/wins/`, and browsers cache permanent redirects, so flipping the home page to basketball in the off-season won't take effect for returning visitors. Use a temporary (307) redirect or a config-driven landing page.

## Phase 3 — Merge duplicated components

1. **Start with the near-copies.** Pull shared chart shells out of each pair, e.g. a `HistoryLineChart` taking `{ data, seriesConfig, sportTheme }` and a shared `ProbabilityHistoryChart` behind the StandingsHistory, FirstPlace, ConfBids and ConfChampion charts. Sport files become thin adapters of about 50–100 lines. That should cut roughly 4–5k lines.
2. **Split the very large files by feature:** `features/game-preview/{data.ts, hooks.ts, sections/*.tsx}`. Rule of thumb: one component per file, logic in hooks, formatting in `lib/`.
3. **Structure by feature, not sport** (`features/standings/`, `features/schedule/`…), with sport differences passed in as config. Place `*.test.tsx` next to each component.
4. **One responsive hook** (`useResponsive`), replacing the 16 hand-rolled ones.
5. **Consolidate exports.** Merge `export-image`, `save-image`, `optimized-screenshot`, `download-compare-chart` and `screenshot-layout` into one export module.

## Phase 4 — Styling

- Turn the modernization guide's card, table and chart styles into Tailwind components/tokens (`design-system.ts` plus `tailwind.config.ts`). Migrate inline styles page by page, as each page is modernized.
- Remove `supress-errors.css`, which hides CSS problems rather than fixing them.

## Phase 5 — Performance

1. **Serve cached pages instead of rendering on every request.** Many pages use `force-dynamic` only because the conference comes from `?conf=`. Moving it into the path (`/football/wins/[conf]/`, as `standings/[conf]` already does) allows static generation plus timed revalidation per conference. The result is CDN-served HTML, better SEO, and lower function cost.
2. **Server Components by default.** 191 files are `"use client"`. Fetch on the server and pass `initialData` down (already done on some pages); keep only the interactive parts client-side. Priorities are game-preview and the archive pages.
3. **Load Chart.js only where it's used.** Lazy-load chart components with `next/dynamic`, `ssr:false`, and a skeleton, and register only the Chart.js pieces each chart needs. Load `html2canvas` only when the user clicks export (it's also listed as a devDependency even though it runs in the browser).
4. **Proxy speed.** Once the endpoint list exists, plain GET passthroughs can move to Next `rewrites` or the Edge runtime, so there's no Node function cold start. Also strip the debug logging and the `JSON.parse` round-trip; stream the backend response straight through.
5. **Enable the caching Vercel already sends headers for.** Use `stale-while-revalidate` consistently, and add ETag/`If-None-Match` support if the backend can provide it.
6. **PWA.** Fix or remove the service worker's dead cache rule, and consider caching `/api/proxy/*` with StaleWhileRevalidate. Also re-evaluate `next-pwa`, which is unmaintained; `@serwist/next` replaces it.
7. **Measure with real users.** Speed Insights is installed; add web-vitals budgets per route in CI via Lighthouse.
8. **Remove shipped debug code.** Load `PerformancePanel` only in dev, and use React Query Devtools only in dev.

## Phase 6 — Infrastructure, security, upgrades

- **Upgrade Next 14 → 15 and React 18 → 19**, after Phase 0 so CI covers it. The proxy already uses the async `params` shape. Also remove `missingSuspenseWithCSRBailout:false`, which hides real problems, and the `ignoreDeprecations` setting.
- **Replace ESLint 8 with ESLint 9**, flat config only; there's currently a mix of the legacy config and FlatCompat.
- **Rate limiting.** The contact form's rate limit is an in-memory Map, which doesn't work on serverless because every instance has its own. Move it to Upstash/Vercel KV, or rely on Vercel's firewall.
- **Security headers.** Add a Content-Security-Policy. Drop the deprecated `X-XSS-Protection` and the duplicate header `<meta>` tags in `layout.tsx`.
- **Monitoring.** Structured logging through `unified-monitoring.ts` in place of the `console.log`s, and a `/api/health` check.
- **Dependencies.** Renovate/Dependabot with CI gating.

## Order and effort

| Order | Phase | Risk | Why here |
|---|---|---|---|
| 1 | 0 — guardrails | Very low | Everything later relies on CI and fixtures to be checked safely. |
| 2 | 1 — endpoint list + fixtures | Medium | Removes the most places a change can be missed. |
| 3 | 2 — sport/season config | Medium | Makes the season rollover straightforward. |
| 4 | 5.1–5.3 — quick performance wins | Low–medium | Can run alongside 3. |
| 5 | 3 — component merging | Medium | Do it pair by pair, with a screenshot diff per PR. |
| 6 | 4, 6 — styling and upgrades | Low–medium | Ongoing as pages are touched. |

**How to run it with agents:** one PR per item, each ending with `npm run verify` plus Playwright screenshots of the affected routes (Chromium is preinstalled in cloud sessions). Avoid one large rewrite PR. The visual-comparison step makes the Phase 3 merges safe to hand to an agent.
