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
| `historical` | any `/history` path, a past date's composite ratings, archived seasons | 1 h | 1 h | 1 h / 1 day |
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
- Step 4b: the path patterns (`cacheClassForBackendPath`) were replaced by an explicit `cacheClass` per entry in `src/api/endpoints.ts`, applied by `cacheClassFor()`. Every endpoint kept its class.

## How to check it

- In production: the "Production baseline" workflow's proxy probe prints each endpoint's `x-vercel-cache` result (HIT/MISS/STALE). Vercel strips `s-maxage` and `stale-while-revalidate` before responding (clients see `Cache-Control: public`), so the lifetimes themselves are checked by the tests below, not in production.
- Locally: `src/lib/__tests__/cache-policy.test.ts` (classification and consistency across layers) and `src/app/api/proxy/[...slug]/__tests__/cache-headers.test.ts` (headers on success, error, unknown endpoint and POST).
- Rollback trigger (plan, "Rollback"): stale data visible beyond a class's window, or backend request volume rising unexpectedly. To roll back, revert the PR; the old values were a flat 5 min (CDN, browser) and 1 h (server).
