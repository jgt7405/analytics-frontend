# Data flow

How data gets from the Flask backend (Railway) to a chart on the page, and every place it is cached on the way. Plan steps 3 and 4 (`docs/ARCHITECTURE_PLAN.md`) consolidate this; update this file when they land.

## Request path

```
Browser
  React component
    → hook in src/hooks/            (React Query: caching, retries, loading/error state)
    → method in src/services/       (basketball-api.ts / football-api.ts, built on shared-request.ts)
    → fetch(proxyUrl("<path>"))     (src/lib/proxy-url.ts → /api/proxy/<path>/; same origin, no CORS, no redirect)
Vercel
  src/app/api/proxy/[...slug]/route.ts
    → validates path segments, maps the URL shape to a backend path (one branch per shape)
    → forwards allowed query params: season, mode, date
    → fetch(BACKEND_API_URL + path), 30 s timeout (5 min for POST exports); BACKEND_API_URL from src/config/env.ts
Railway
  Flask backend /api/...
```

Server-rendered first paint skips the browser leg: `page.tsx` calls a helper in `src/lib/server-api.ts`, which fetches the backend directly and passes the result to the client hook as React Query `initialData`. Today only some pages do this (e.g. `/football/wins/`, which makes zero browser data requests on load).

## Caching layers

Freshness is set per **class of data** in `src/lib/cache-policy.ts` (`live`, `currentStandings`, `historical`, `referenceData`, `scenario`). Which endpoint is in which class, and why: `docs/decisions/cache-classes.md`.

| Layer | Where | Setting |
|---|---|---|
| React Query (browser memory) | each hook spreads `...queryCachePolicy("<class>")`; `QueryProvider.tsx` defaults to `currentStandings` | Fresh for 30 s (live) to 24 h (reference data). No refetch on window focus, no retry on 4xx |
| Vercel CDN | proxy GET responses; class from the endpoint's entry in `src/api/endpoints.ts`, `historical` for an archived `?season=` | `s-maxage` 30 s to 24 h per class. POSTs `private, no-store`. Errors `no-store`. Measured before classes: first call per URL is a MISS (up to ~0.6 s), then HITs at ~25 ms |
| Next data cache (server) | `src/lib/server-api.ts`, `src/app/sitemap.ts` | `revalidate` per class, same lifetime as the CDN |
| Proxy → backend | proxy route | `cache: "no-store"` (the CDN layer above does the caching) |
| Service worker | `src/sw.ts` (Serwist) | Images cached 1 day (64 entries). Build JS/CSS precached. Pages and API data are never cached here |

## Logging

The proxy writes one `info` line per request that reaches it (CDN hits never do): method, path, status, duration, endpoint key, cache class and Vercel's request ID (`x-vercel-id`, also returned to the browser). Backend failures add a `warn` line with the endpoint key and status. Find them in Vercel → Logs; each line is JSON from `src/lib/logger.ts`. Successful proxy responses also carry an `x-cache-class` header.

## Adding or changing an endpoint

Every endpoint the proxy forwards is an entry in `src/api/endpoints.ts`: path shape, method, a rule per path parameter, allowed query parameters (format-checked), timeout and cache class. Anything else is rejected before reaching the backend (404 unknown path, 405 wrong method, 400 bad parameter or query parameter). Responses carry `x-endpoint` (the entry's key) and `x-cache-class`. `src/services/AGENTS.md` and the `add-endpoint` skill list the remaining places a new endpoint touches.

## Contract with the backend

The backend owns response shapes. Until step 4 formalizes this with Zod schemas and contract tests:

- Frontend types for responses live in `src/types/` and in the service files. When the backend adds fields, add them there; when it removes or renames one, the frontend must change first (or in the same release).
- The daily "Production baseline" workflow (`scripts/proxy-probe.mjs --strict`) fails if representative endpoints error or return empty or non-JSON bodies. A failed run emails the repo owner.
- Backend changes that affect shape should be noted in the pull request that adapts the frontend.
