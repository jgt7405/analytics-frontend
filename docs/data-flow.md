# Data flow

How data gets from the Flask backend (Railway) to a chart on the page, and every place it is cached on the way. Plan steps 3 and 4 (`docs/ARCHITECTURE_PLAN.md`) consolidate this; update this file when they land.

## Request path

```
Browser
  React component
    → hook in src/hooks/            (React Query: caching, retries, loading/error state)
    → method in src/services/       (basketball-api.ts / football-api.ts, built on shared-request.ts)
    → fetch("/api/proxy/<path>")    (same origin, so no CORS; note: no trailing slash today → 308 first)
Vercel
  src/app/api/proxy/[...slug]/route.ts
    → validates path segments, maps the URL shape to a backend path (one branch per shape)
    → forwards allowed query params: season, mode, date
    → fetch(BACKEND_API_URL + path), 30 s timeout (5 min for POST exports)
Railway
  Flask backend /api/...
```

Server-rendered first paint skips the browser leg: `page.tsx` calls a helper in `src/lib/server-api.ts`, which fetches the backend directly and passes the result to the client hook as React Query `initialData`. Today only some pages do this (e.g. `/football/wins/`, which makes zero browser data requests on load).

## Caching layers

| Layer | Where | Setting today |
|---|---|---|
| React Query (browser memory) | `src/components/providers/QueryProvider.tsx`, per-hook overrides | `staleTime` 5 min, `gcTime` 10 min, no refetch on window focus, no retry on 4xx |
| Vercel CDN | proxy GET responses | `Cache-Control: public, s-maxage=300, stale-while-revalidate=60`. Measured: first call per URL is a MISS (up to ~0.6 s), then HITs at ~25 ms |
| Next data cache (server) | `src/lib/server-api.ts`, `src/app/sitemap.ts` | `revalidate: 3600` (1 hour) |
| Proxy → backend | proxy route | `cache: "no-store"` (the CDN layer above does the caching) |
| Service worker | `next.config.js` (next-pwa) | Images cached 1 day. The API rule points at an old backend host and never matches |

The 5-minute and 1-hour settings disagree; step 3 replaces them with named freshness classes (live, current standings, historical, reference data, what-if scenario). Error responses are not cached by the CDN (no cache header on errors).

## Adding or changing an endpoint

Today an endpoint must be registered in up to four places. `src/services/AGENTS.md` and the `add-endpoint` skill list them. Step 4 replaces the per-shape proxy branches with one typed endpoint list.

## Contract with the backend

The backend owns response shapes. Until step 4 formalizes this with Zod schemas and contract tests:

- Frontend types for responses live in `src/types/` and in the service files. When the backend adds fields, add them there; when it removes or renames one, the frontend must change first (or in the same release).
- The daily "Production baseline" workflow (`scripts/proxy-probe.mjs --strict`) fails if representative endpoints error or return empty or non-JSON bodies. A failed run emails the repo owner.
- Backend changes that affect shape should be noted in the pull request that adapts the frontend.
