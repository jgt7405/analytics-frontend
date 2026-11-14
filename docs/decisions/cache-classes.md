# Decision: cache freshness per class of data

Date: 2026-09-26. Plan step 3 (`docs/ARCHITECTURE_PLAN.md`). Implemented in `src/lib/cache-policy.ts`.

## Context

Before this change, every layer used a single cache setting, and the layers disagreed with each other:

- The CDN kept proxy responses for 5 minutes, with 60 s stale-while-revalidate.
- Server-side fetches (first paint) kept backend data for 1 hour, so a server-rendered table could be up to an hour older than what the same page fetched a moment later.
- React Query treated data as fresh for 5 minutes (a few hooks used 15 or 60 minutes).
- POST results (what-if calculations and exports) were sent with a public CDN cache header. Vercel doesn't cache POSTs, but the header was wrong.

The step 1 probe showed that uncached calls cost up to ~0.6 s, while cached calls cost about 25 ms. Team lists and history charts, which barely change, were fetched from the backend as often as live data.

## Decision

Five named classes. Each backend endpoint belongs to exactly one, and every layer reads its settings from `CACHE_POLICIES`.

| Class | Endpoints | Browser (React Query fresh) | Server fetch | CDN (`s-maxage` / `stale-while-revalidate`) |
|---|---|---|---|---|
| `live` | upcoming and future games, bowl picks and scoreboard | 30 s | 30 s | 30 s / 30 s |
| `currentStandings` | standings, projections, seeds, CWV/TWV, schedules, team pages, everything not listed elsewhere | 5 min | 5 min | 5 min / 10 min |
| `history` | current-season `/history` charts and rating timelines | 1 min | 1 min | 1 min / 5 min |
| `historical` | a past date's composite ratings, archived seasons | 1 h | 1 h | 1 h / 1 day |
| `referenceData` | `/basketball_teams`, `/football_teams`, the what-if conference list | 24 h | 24 h | 24 h / 7 days |
| `scenario` | every POST (what-if, exports, uploads) | never fresh | not cached | `private, no-store` |

The rules:

- **Errors are never cached.** Every error response and every unknown endpoint gets `Cache-Control: no-store`. The route handler sets this once for all return paths (`GET`/`POST` wrappers in the proxy route). Next's data cache doesn't keep failed server fetches.
- **Maximum staleness per class** is about `s-maxage` + `stale-while-revalidate`. The stale window only serves an older copy to the one visitor whose request triggers the background refresh. For standings that is at most 15 minutes after the backend updates; for most visitors it is 5.
- **Archived seasons.** Requests with a `?season=` listed in `ARCHIVED_SEASONS` are cached as `historical` (except reference data, which keeps its longer class). Only finished seasons are listed. Basketball 2025-26 is still served as the current season, so it is not listed. Leaving a finished season off the list only costs cache hits; listing a current season would show stale data. The `season-rollover` skill updates the list, until step 6's season config replaces it.
- **Browser HTTP cache.** Vercel doesn't pass `s-maxage` on to browsers, so API data is cached in the browser only by React Query, in memory. The service worker never caches API data (`src/sw.ts`).

## Consequences

- The backend receives fewer requests for team lists and history charts. It receives more server-side first-paint requests for current standings, because that cache dropped from 1 hour to 5 minutes; these are bounded by one request per URL per 5 minutes.
- Server-rendered first paint is no older than the same class on the CDN.
- Hooks that pass `initialDataUpdatedAt: 0` still refetch on mount even when the server data is fresh. Removing that refetch is part of step 9 (server rendering), once first-paint freshness is measured.
- The bowl picks and scoreboard queries live inside components, so they use the provider default (`currentStandings`) in the browser, while the CDN treats them as `live`. Step 4 moves them into hooks with the `live` class.
- 2026-10-26, after a traffic spike timed out every proxied request: the proxy's GET fetch uses Next's data cache with the class's server `revalidate` (it was `no-store`). Past the lifetime the stored copy is answered at once and refreshed in the background, and a failed or hung refresh keeps it, so a slow or down backend serves the last good data instead of errors. Only URLs never fetched before wait on the backend.
- 2026-11-01, after the first visitor each morning saw last night's results (a team page 6-1 from the CDN while the backend had 6-2): a timer only marks a copy stale, and the next request is still answered with it while it refreshes. Overnight few URLs are visited, so the first view of a page after a pipeline run got the pre-run copy, and the CDN then kept that copy for up to 15 more minutes. Now every cached GET carries its sport's tag (`sportCacheTag()`: `next.tags` on proxy and server fetches, `Vercel-Cache-Tag` on proxy responses), and the pipeline calls `POST /api/revalidate/` when a sport's run finishes (no secret since 2026-11-14: the cron services never had one set, so the call was being skipped; the route only drops copies of public data and won't clear the same sport twice within a minute per instance). The route expires the tag in Next's data cache (`revalidateTag(tag, { expire: 0 })`, which also covers the ISR team pages) and deletes it from the CDN (`dangerouslyDeleteByTag`), so the next request goes to the backend. The timers stay as the fallback when the call fails.
- 2026-11-02, after pages showed the right data for a moment and then the previous day's: the server-rendered first paint was fresh, but the browser's refetch through the proxy got a day-old copy from Next's data cache. On Vercel the proxy's data-cache entries (Villanova's NCAA history, Ohio State's team page) kept answering the pre-run copy for hours: through `/api/revalidate` and through the background refreshes that should have replaced them. The CDN then stored that stale answer as new. The proxy no longer uses Next's data cache: every GET it handles asks the backend (`cache: "no-store"`), and the CDN in front of it stays the shared cache. For the 10-26 resilience, `src/lib/last-good-cache.ts` keeps the last good response per URL in the instance's memory (64 MB cap), served only on a 5xx, a thrown fetch or a timeout, with the `live` CDN lifetime and `x-proxy-fallback: last-good`. A cold instance during an outage has nothing to serve and returns the error. Also: current-season history charts got their own class, `history` (1 min on every layer), so a missed revalidate call costs a minute instead of up to a day; `historical` is now only archived seasons and a past date's composite ratings. Server-rendered fetches (`src/lib/server-api.ts`) still use the data cache, which the ISR pages need.
- Step 4b: the path patterns (`cacheClassForBackendPath`) were replaced by an explicit `cacheClass` per entry in `src/api/endpoints.ts`, applied by `cacheClassFor()`. Every endpoint kept its class.

## How to check it

- In production: the "Production baseline" workflow's proxy probe prints each endpoint's `x-vercel-cache` result (HIT/MISS/STALE). Vercel strips `s-maxage` and `stale-while-revalidate` before responding (clients see `Cache-Control: public`), so the lifetimes themselves are checked by the tests below, not in production.
- Locally: `src/lib/__tests__/cache-policy.test.ts` (classification and consistency across layers) and `src/app/api/proxy/[...slug]/__tests__/cache-headers.test.ts` (headers on success, error, unknown endpoint and POST).
- Rollback trigger (plan, "Rollback"): stale data visible beyond a class's window, or backend request volume rising unexpectedly. To roll back, revert the PR; the old values were a flat 5 min (CDN, browser) and 1 h (server).
