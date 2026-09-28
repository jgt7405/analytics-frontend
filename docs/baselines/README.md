# Baselines

Numbers every later refactor step is compared against (see `docs/ARCHITECTURE_PLAN.md`, step 1).
Each performance PR should state its before/after against the most recent baseline here.

## How to re-measure

| What | Command | Where it must run |
|---|---|---|
| Lint, types, unit tests | `npm run verify` | Anywhere |
| Production build + route sizes | `npm run verify:full` (or `npm run build && npm run size`) | Anywhere; no backend needed |
| Route sizes as JSON | `npm run size -- --json > docs/baselines/<date>-route-sizes.json` | After a build |
| Lighthouse, lab Web Vitals, requests per page | `npm run baseline:lighthouse` (defaults to the production site; `-- --base <url>` for another host, `-- --runs 5` for more runs) | Somewhere that can reach the site **and** its backend. Easiest: GitHub → Actions → "Production baseline" → Run workflow |
| Proxy reliability, cache and latency | `npm run baseline:proxy` (`-- --rounds 10` for more) | Same; also runs in the "Production baseline" workflow |
| Field Core Web Vitals | Vercel dashboard → Speed Insights | Vercel |
| Proxy error and timeout rates | Vercel dashboard → Logs, filter `/api/proxy` | Vercel |
| Indexing (step 6) | Search Console → Pages → "Why pages aren't indexed"; Performance → Pages (3 months); Sitemaps | Search Console, by the owner |

Build times depend on the machine; compare only numbers taken on the same kind of machine.

## 2026-09-25 — before any refactor

Commit: the step 1 commit on `claude/website-architecture-plan-3mbdra`. Machine: Claude Code cloud container (Linux, Node 22.22, npm 10.9), cold build with no `.next` cache.

### Checks

| Check | Result | Time |
|---|---|---|
| `npm run lint` (ESLint CLI) | 0 errors, 41 warnings: 30 `no-explicit-any`, 8 `exhaustive-deps`, 2 `no-img-element`, 1 `role-has-required-aria-props` | — |
| `npm run type-check` | Pass | ~19 s |
| `jest --ci` | 4 suites, 22 tests, all pass | ~19 s |
| `npm run verify` (all three) | Pass | 32 s |
| `npm run build` | Pass, works with the backend unreachable | 80–81 s |

Before this step, `npm run lint` (`next lint`) did not run at all: it stopped at an interactive "How would you like to configure ESLint?" prompt. Running the ESLint CLI directly surfaced 23 errors, now fixed or configured (see the step 1 commit).

### Route bundle sizes (gzipped JS)

`pageKb` tracks Next's "First Load JS" column. `totalKb` adds the chunks of every layout above the page (header, providers), which a browser also downloads on a cold visit; budgets in step 2 should use `totalKb`. Full list: [`2026-09-25-route-sizes.json`](./2026-09-25-route-sizes.json).

Across all 63 routes: min 133.3 kB, median 179.4 kB, max 260.6 kB (`totalKb`).

| Route | pageKb | totalKb |
|---|---|---|
| `/` (redirect) | 92.4 | 133.3 |
| `/football/wins` | 148.1 | 172.2 |
| `/football/standings` | 234.9 | 258.9 |
| `/football/team/[teamname]` | 226.7 | 255.6 |
| `/football/[season]/wins` | 148.2 | 172.4 |
| `/football/whatif` | 164.8 | 188.8 |
| `/football/bowlpicks` | 124.7 | 153.8 |
| `/basketball/standings` | 236.3 | 260.4 |
| `/basketball/compare` | 121.8 | 155.3 |
| `/basketball/game-preview` | 226.7 | 260.2 |
| `/basketball/whatif` | 130.6 | 159.6 |

Shared by all routes (Next's figure): 94.2 kB.

### Lab data — Lighthouse against production

Lighthouse 12, mobile preset (simulated slow 4G and a mid-range phone, so slower than the field numbers below), median of 3 runs per route, run from GitHub Actions ([run 36194545011](https://github.com/jgt7405/analytics-frontend/actions/runs/36194545011)). Full data: [`2026-09-25-lighthouse.json`](./2026-09-25-lighthouse.json). Re-run from the Actions tab → "Production baseline" → Run workflow.

| Route | Perf | A11y | SEO | LCP | TBT | CLS | JS transfer | `/api/proxy` calls | Requests |
|---|---|---|---|---|---|---|---|---|---|
| `/football/wins/` | 91 | 96 | 100 | 2.72 s | 258 ms | 0 | 439 kB | 0 | 88 |
| `/football/standings/` | 98 | 96 | 100 | 2.35 s | 86 ms | 0 | 506 kB | 2 | 89 |
| `/football/team/Alabama/` | 97 | 96 | 100 | 2.05 s | 150 ms | 0 | 530 kB | 10 | 122 |
| `/football/2025-26/wins/` (archive) | 84 | 100 | 66 | 4.16 s | 95 ms | 0.082 | 387 kB | 2 | 62 |
| `/basketball/standings/` | 98 | 100 | 100 | 2.35 s | 39 ms | 0 | 501 kB | 2 | 82 |
| `/basketball/compare/` | 90 | 98 | 100 | 2.36 s | 341 ms | 0.023 | 391 kB | 2 | 235 |
| `/basketball/game-preview/` | 98 | 96 | 100 | 2.42 s | 26 ms | 0.021 | 515 kB | 2 | 65 |

Best practices: 100 everywhere except the archive page (96).

Notes:
- `/football/wins/` makes no proxy calls: its default conference is server-rendered and handed to React Query as `initialData`. It's the model for step 9.
- The archive page is the slowest (LCP 4.2 s) and the only one with layout shift. Its SEO score of 66 is expected, since archives are `noindex`. It renders entirely client-side (see the plan's findings).
- The team page makes 10 proxy calls; `/basketball/compare/` makes 235 requests in total (likely team logos) and has the highest blocking time.
- JS transfer (390–530 kB) is higher than the route-size table above because it also counts lazily loaded chunks and third-party scripts (Google Analytics, Vercel).

### Field data — Vercel Speed Insights, desktop

Real visitors, P75, as shown in the Vercel dashboard on 2026-09-25 (dashboard's default date range, about 1.1K US visits).

| Metric | P75 |
|---|---|
| Real Experience Score | 100 (Great) |
| First Contentful Paint | 1.38 s |
| Largest Contentful Paint | 1.53 s |
| Interaction to Next Paint | 72 ms |
| Cumulative Layout Shift | 0.05 |
| First Input Delay | 6 ms |
| Time to First Byte | 0.54 s |

Per-route Real Experience Score (visits in brackets). The site overall is fast on desktop; the weak spots are specific pages:

| Band | Routes |
|---|---|
| Poor (<50) | `/football/seed` 47 (36) |
| Needs improvement (50–90) | `/football/compare` 59 (8), `/basketball/seed` 75 (12), `/football/[season]/wins` 77 (8), `/football/cfp` 83 (17), `/basketball/teams` 87 (29), `/basketball/schedule` 87 (9) |
| Great (>90) | `/football/team/[teamname]` 100 (265), `/football/wins` 99 (124), `/football/whatif` 100 (76), `/basketball/team/[teamname]` 99 (73), `/basketball/home` 100 (70), `/football/home` 100 (50), `/football/schedule` 100 (38) |

Visit counts on the weak routes are small, so treat their scores as indicative. Visitors from Ireland (7 visits) scored 21; too few to draw conclusions, but distance from the US-hosted servers is one possible cause.

### Field data — Vercel Speed Insights, mobile

Same dashboard and date range, mobile selector; 1,058 events, almost all US.

| Metric | P75 |
|---|---|
| Real Experience Score | 100 (Great) |
| First Contentful Paint | 1.03 s |
| Largest Contentful Paint | 1.24 s |
| Interaction to Next Paint | 88 ms |
| Cumulative Layout Shift | 0.06 |
| First Input Delay | 28 ms |
| Time to First Byte | 0.34 s |

| Band | Routes |
|---|---|
| Poor (<50) | none |
| Needs improvement (50–90) | `/football/twv` 85 (14) |
| Great (>90) | `/football/wins` 100 (287), `/football/team/[teamname]` 100 (256), `/basketball/team/[teamname]` 100 (88), `/football/seed` 100 (77), `/basketball/home` 100 (62), `/football/schedule` 100 (57), `/football/whatif` 100 (53) |

`/football/seed` scores 100 on mobile (77 visits) but 47 on desktop (36 visits), so its problem is desktop-specific, e.g. layout shift from the wider desktop table or chart, rather than data loading.

### Backend proxy — synthetic probe against production

`scripts/proxy-probe.mjs` from GitHub Actions ([run 36195612918](https://github.com/jgt7405/analytics-frontend/actions/runs/36195612918)): 14 representative `/api/proxy` endpoints, 5 rounds each, requested exactly as the site's client code does. Full data: [`2026-09-25-proxy-probe.json`](./2026-09-25-proxy-probe.json). Re-run with `npm run baseline:proxy` or the "Production baseline" workflow.

| Result | Value |
|---|---|
| Failures / timeouts | **0 of 70** |
| Vercel CDN cache | 57 of 70 served from cache (`HIT`); the 13 `MISS`es were each endpoint's first call (`/basketball_teams` was already cached) |
| First (uncached) response | 62–572 ms; slowest `/ncaa_tourney/All_Teams` 572 ms, `/cwv/SEC` 421 ms, `/football_teams` 390 ms |
| Cached response | median 16–33 ms per endpoint (median of medians 25 ms) |
| Trailing-slash redirect | **70 of 70** calls were 308-redirected before the real request |

Findings:
- The proxy and backend were fully reliable during the probe, and the CDN's 5-minute cache works: after the first visitor, a cached response is ~25 ms from a US data center.
- The uncached first hit is where the time goes (up to ~0.6 s), so the step 3 cache classes should keep reference data (team and conference lists) cached much longer than 5 minutes.
- Every browser data call pays an extra redirect round trip because client code omits the trailing slash. From a data center that costs little; on a phone each extra round trip typically costs tens to hundreds of ms. Fix scheduled in step 3.
- This is a synthetic check. Real-traffic error rates are in the Vercel logs (Logs tab, search `/api/proxy`, filter 4xx/5xx); looking there is optional.

### Lighthouse variance

A second Lighthouse run 13 minutes later (run 36195612918) moved some performance scores by up to 17 points with no code change: `/football/standings/` 98 → 81, `/football/team/Alabama/` 97 → 82, while the archive page's LCP improved 4.2 s → 2.7 s. Accessibility, SEO, request counts and JS transfer were stable. Lab performance scores from shared CI runners are noisy, so:
- Compare performance only across multiple runs (use `--runs 5` or more for before/after claims).
- In CI, gate on accessibility and on request/byte counts; keep the performance score as a warning (as the plan already says).

### Other observations

- `npm ci` reported 48 known vulnerabilities in dependencies (2 low, 17 moderate, 28 high, 1 critical). Step 2 cut this to 16 and step 5 to 0.

## 2026-09-26 — after step 5 (Next.js 16, React 19, Turbopack build)

| Measure | Next 14 (2026-09-25) | Next 16, Turbopack (2026-09-26) |
|---|---|---|
| Production build (cloud container, cold) | 80 s | 31 s |
| Shared JS runtime (gzipped) | 94 kB | 127 kB |
| Route first-load JS, min / median / max | 133 / 179 / 261 kB | 165 / 207 / 276 kB ([data](./2026-09-26-route-sizes-turbopack.json)) |
| Service worker precache | 630 files, ~21 MB (all of `public/`) | 151 files, ~1.2 MB transfer |
| Known dependency vulnerabilities | 48 | 0 |

Route sizes are measured with `scripts/route-sizes.mjs`, which reads Next 16's per-route client reference manifests (Next 14's `app-build-manifest.json` no longer exists), so compare the two columns as totals rather than to the exact kB. The increase is the framework runtime; route-specific code did not grow. Lighthouse in CI on the Next 16 PR (single run per route, same job as on Next 14) averaged 82 vs 78 across the 7 routes, within run-to-run noise.

Field data after the upgrade: re-check Vercel Speed Insights a week after deploy and add it here.

## 2026-09-26 — after step 3a (proxy URLs with trailing slash)

Proxy probe against production from GitHub Actions ([run 36218172541](https://github.com/jgt7405/analytics-frontend/actions/runs/36218172541)), 16 endpoints × 5 rounds, now requested the way the client does after #19:

| Result | Before (2026-09-25) | After |
|---|---|---|
| Trailing-slash redirects | 70 of 70 calls | **0 of 80** |
| Failures | 0 | 0 |
| Cached response, median of medians | 25 ms | 27 ms |
| Slowest first (uncached) response | 572 ms | 566 ms (`/ncaa_tourney/All_Teams`) |

`/football/standings/SEC/?season=2025-26` returned an empty `data` array, so the probe no longer includes it (see the step 3b PR).

## 2026-09-27 — Search Console, before step 6d (route migration)

Google Search Console → Pages, "Why pages aren't indexed", last updated **2026-09-20**. That predates 6c (per-page canonicals, archive metadata), so it describes the site before any step 6 change. Totals recorded by the owner (screenshots, 2026-09-27); per-URL exports, Performance and Sitemaps added 2026-09-28 (desktop exports, summarized below; the raw exports are not committed). Live responses were checked against production on 2026-09-28, after 6d and 6e deployed.

| All known pages | Pages |
|---|---|
| Indexed | **484** (peak 502 on 2026-08-28; 496 → 490 → 484 through September) |
| Not indexed | **947** (10 reasons) |
| Total | 1,431 (about 1.2K in early July; the rise came in late August and early September) |

| Reason | Source | Validation | Pages | Expected effect of step 6 |
|---|---|---|---|---|
| Alternate page with proper canonical tag | Website | Failed | 415 | `?conf=` views canonicalizing to their page. Working as intended; unchanged by step 6 |
| Duplicate without user-selected canonical | Website | Failed | 134 | None. Contains no archive or season URLs (see patterns below); the cause is team pages and `?conf=` views, which step 6 didn't change |
| Page with redirect | Website | Not started | 178 | Unchanged. Trailing slash, `www` and legacy redirects; all resolve. No season URLs among them |
| Not found (404) | Website | Not started | 14 | Unchanged. No season URLs among them |
| Soft 404 | Website | Not started | 4 | Should fall as Google recrawls: the four team URLs now serve real pages |
| Crawled – currently not indexed | Google systems | Not started | 145 | Unchanged |
| Excluded by 'noindex' tag | Website | Passed | 11 | Archive pages; may rise as Google recrawls them |
| Redirect error | Website | Passed | 3 | Should stay at or near 0: every step 6 redirect is one hop |
| Discovered – currently not indexed | Google systems | Passed | 41 | Not exported |
| Duplicate, Google chose different canonical than user | Google systems | Passed | 2 | Not exported |

### URL patterns per reason

No exported list, and no page in Performance, contains a `/<sport>/2026-27/` URL, an unlisted season or an archive (`/<sport>/2025-26/`) URL. Google knew none of the URLs whose response 6d changed. The only changed response it knew is `/` (308 → 307, same target).

**Duplicate without user-selected canonical (134)**

| Pattern | URLs | Live on 2026-09-28 |
|---|---|---|
| Current team pages (31 basketball, 14 football) | 45 | 200, self-canonical, `index, follow`, server-rendered text. **Should be indexed.** 11 were recrawled 09-08 to 09-17 and failed validation |
| `?conf=` views (4 without trailing slash) | 88 | 200, canonical to the page. Intended |
| `/basketball/wins/` (crawled 2026-08-10) | 1 | 200, self-canonical. **Should be indexed** |
| Old `?conference=…&active_tab=` form, one garbled `?conf=` | 2 | Serve the page, canonical to it |

URL Inspection of `/basketball/team/Nebraska/` (crawled 2026-09-17, smartphone): user-declared canonical **None**, Google-selected canonical **`https://www.747live.bet/`** (an unrelated betting site). The live test on 2026-09-28 says "Page can be indexed". Our HTML declares the canonical inside a clean `<head>`, and no client code changes it.

**Alternate page with proper canonical tag (415)**

| Pattern | URLs | Live |
|---|---|---|
| `?conf=` views (5 without trailing slash) | 392 | Canonical to the page. Intended |
| Team pages with `?teamConf=` / `?conf=` (some double-encoded, `Big%252012`, from old links; no current code builds `teamConf`) | 7 | Canonical strips the query |
| Underscore or slashless team slugs | 11 | Redirect (308) to the encoded-space URL |
| Old `?conference=…&active_tab=` form | 5 | Serve the page, canonical to it |

**Page with redirect (178)**

| Pattern | URLs | Live |
|---|---|---|
| Slashless `?conf=` views and pages | 101 | 308 to the trailing-slash URL |
| Slashless, `?teamConf=` or underscore team pages on `www` | 42 | 308, one or two hops |
| Non-`www` pages (26 team pages, 1 other) | 27 | 308 to `www`, then as above |
| `/` on `www`, apex and `http`, and `/?conference=…&active_tab=` | 8 | 308 to `https://www`, then 307 (was 308) to `/football/wins/`, query kept |

**Not found (404) (14)**

| Pattern | URLs | Live |
|---|---|---|
| Non-`www` underscore team slugs (crawled May–June) | 4 | Now 200 via two 308s |
| Old `/_next/static/` CSS/JS from previous deployments | 7 | 404. Harmless |
| `/Oklahoma`, `/Texas Tech` (team name at the root) | 2 | 404. No internal link produces them |
| `/football/team/Southeast Missouri State/` | 1 | 404: an FCS school, no football team page |

**Soft 404 (4):** team pages Duquesne (non-`www`, slashless), Alabama and Utah State (`?teamConf=`), North Carolina A&T, crawled May–June. All now 200 with content.

**Crawled – currently not indexed (145)**

| Pattern | URLs | Live |
|---|---|---|
| Old `/_next/static/` CSS files | 65 | Not meant to be indexed |
| Team pages: 14 non-`www` (Feb–Jun), 9 slashless or `?teamConf=`, 13 current URLs crawled Jun–Sep | 36 | 200, self-canonical. The 13 current ones should be indexed |
| `?conf=` views and slashless pages | 40 | Intended |
| `/?conference=…`, `http` apex home | 4 | Redirect |

### Indexed pages against the sitemap

Live sitemap on 2026-09-28: 534 URLs (31 pages, 365 basketball teams, 138 football teams). 533 return 200; **`/basketball/team/West%20Florida/` returns 404** (in the backend's team list, but the team page doesn't find it). Search Console's two submitted sitemaps (`www` and apex, both read 2026-09-21) each show 531 discovered.

| | Count |
|---|---|
| Indexed (export) | 484 |
| Indexed and in the sitemap | 425 |
| Indexed, not in the sitemap | 59: 52 `?conf=` / `?game=` views, 7 team URL variants |
| **In the sitemap, not indexed** | **109**: 73 basketball teams, 20 football teams, 16 pages |

The 16 unindexed sitemap pages: basketball `wins`, `standings`, `conf-tourney`, `conf-data`, `compare`, `season-info`, `game-preview`, `composite-ratings`; football `cwv`, `schedule`, `twv`, `conf-champ`, `teams`, `compare`, `season-info`, `composite-ratings`. For 12 of them Google has indexed one or more `?conf=` views instead (for example `/football/schedule/?conf=Big 12`), even though those views declare the page as canonical. Only `/basketball/wins/` appears in an exported reason list; the rest are probably under "Discovered – currently not indexed" or "Duplicate, Google chose different canonical", which weren't exported.

### Performance — Search results, last 3 months (2026-06-26 to 2026-09-25, web)

All before 6d. **182 clicks, 5,954 impressions** (desktop 94 / 3,618, average position 17.8; mobile 87 / 2,220, 9.6; tablet 1 / 116). 427 pages and 331 queries with impressions.

Top pages by clicks:

| Page | Clicks | Impressions | Position |
|---|---|---|---|
| `/football/wins/` | 70 | 406 | 4.8 |
| `/football/home/` | 20 | 439 | 8.2 |
| `/football/whatif/` | 17 | 94 | 4.2 |
| `/football/cfp/` | 16 | 279 | 11.3 |
| `/football/compare/?conf=Big 12` | 4 | 87 | 11.9 |
| `/football/team/Rutgers/` | 3 | 331 | 9.1 |
| `/basketball/home/` | 3 | 206 | 6.6 |
| `/football/home/?conf=Pac-12` | 2 | 74 | 7.9 |
| `/football/whatif/?conf=Big 12` | 2 | 70 | 8.2 |

Top pages by impressions (beyond those above):

| Page | Clicks | Impressions | Position |
|---|---|---|---|
| `/football/teams/?conf=Big 12` | 0 | 452 | 34.9 |
| `/football/team/Central Michigan/` | 0 | 257 | 16.7 |
| `/basketball/seed/` | 1 | 207 | 10.7 |
| `/football/team/Northwestern/` | 1 | 201 | 8.4 |
| `/basketball/team/Duquesne/` | 0 | 114 | 19.9 |
| `/football/team/Old Dominion/` | 1 | 106 | 24.2 |
| `/football/team/Ohio/` | 1 | 104 | 37.3 |
| `/basketball/whatif/` | 0 | 87 | 6.4 |

By pattern:

| Pattern | Pages | Clicks | Impressions |
|---|---|---|---|
| Football team pages | 117 | 29 | 2,302 |
| Basketball team pages (8 of them non-`www`) | 241 | 12 | 1,487 |
| Football `home`, `wins`, `whatif`, `cfp` (incl. `?conf=`) | 14 | 127 | 1,436 |
| Other pages and `?conf=` views | 53 | 14 | 1,473 |
| `/` (`www` and apex) | 2 | 1 | 24 |
| Archive, `2026-27` or unknown-season URLs | 0 | 0 | 0 |

Top queries: "jthom analytics" 32 clicks / 63 impressions, "cfp projections" 16 / 376, "jthom" 11 / 70, "cfp simulator" 9 / 55, "rutgers football standings" 1 / 259.

**No top-traffic page is affected by a step 6 redirect or 404.** `/` changed from 308 to 307 with the same target.

### Re-check around 2026-10-11

Same exports, desktop, saved outside the repos (only summaries go here):

1. Indexing → Pages, **All known pages** → Export → Download CSV (totals and reasons).
2. Same page, click each reason row → Export → Download CSV: Duplicate without user-selected canonical, Page with redirect, Not found (404), Soft 404, Crawled – currently not indexed, Alternate page with proper canonical tag; also Discovered – currently not indexed, Excluded by 'noindex' tag, Redirect error.
3. Pages → **View data about indexed pages** → Export.
4. Performance → Search results → Date → Custom **2026-09-27 to 2026-10-10** → Export; and **Compare** that range with 2026-09-13 to 2026-09-26 (the two weeks before) → Export.
5. Indexing → Sitemaps: screenshot (last read, discovered pages).
6. URL Inspection: `/basketball/team/Nebraska/`, `/basketball/wins/`, `/football/2025-26/wins/`: screenshot the Page indexing panel.

What should move:

| Number | Now | Expected | Roll back (plan step 6, item 4) if |
|---|---|---|---|
| Not found (404) | 14 | ≤ 20; any new rows should be unlisted-season URLs only | A current page or team URL appears |
| Redirect error | 3 | 0–3 | Any `/<sport>/2026-27/` URL appears |
| Page with redirect | 178 | About the same; may gain `/<sport>/2026-27/` URLs if Google finds any | — |
| Soft 404 | 4 | ≤ 4 | — |
| Excluded by 'noindex' | 11 | May rise (archive pages recrawled) | A seasonless page appears |
| Indexed | 484 | ≥ 484 | Falls below about 460 |
| Clicks, 2 weeks after vs before, pages step 6 touched (`/`, archive, season URLs) | `/` 1 click in 3 months | No meaningful change | — |
| Clicks, 2 weeks after vs before, `/football/wins/`, `/football/home/`, `/football/whatif/`, `/football/cfp/` | 123 of 182 in 3 months | Seasonal swings only (football season in progress) | Down more than 30% while impressions hold |

Search Console reports lag by several days; if "Last updated" on the Pages report is before 2026-10-04, wait and re-export.
