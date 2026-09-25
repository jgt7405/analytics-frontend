# Baselines

Numbers every later refactor step is compared against (see `docs/ARCHITECTURE_PLAN.md`, step 1).
Each performance PR should state its before/after against the most recent baseline here.

## How to re-measure

| What | Command | Where it must run |
|---|---|---|
| Lint, types, unit tests | `npm run verify` | Anywhere |
| Production build + route sizes | `npm run verify:full` (or `npm run build && npm run size`) | Anywhere; no backend needed |
| Route sizes as JSON | `npm run size -- --json > docs/baselines/<date>-route-sizes.json` | After a build |
| Lighthouse, lab Web Vitals, requests per page | `npm run baseline:lighthouse` (defaults to the production site; `-- --base <url>` for another host, `-- --runs 5` for more runs) | Somewhere that can reach the site **and** its backend |
| Field Core Web Vitals | Vercel dashboard → Speed Insights | Vercel |
| Proxy error and timeout rates | Vercel dashboard → Logs, filter `/api/proxy` | Vercel |

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

Lighthouse 12, mobile preset (simulated slow 4G and a mid-range phone, so slower than the field numbers below), median of 3 runs per route, run from GitHub Actions ([run 36194545011](https://github.com/jgt7405/analytics-frontend/actions/runs/36194545011)). Full data: [`2026-09-25-lighthouse.json`](./2026-09-25-lighthouse.json). Re-run from the Actions tab → "Lighthouse baseline" → Run workflow.

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

### Not yet recorded

- **Proxy error and timeout rates** from Vercel logs (Logs tab, search `/api/proxy`, filter 4xx/5xx).

### Other observations

- `npm ci` reports 48 known vulnerabilities in dependencies (2 low, 17 moderate, 28 high, 1 critical). To be triaged in step 2 alongside Dependabot/Renovate.
