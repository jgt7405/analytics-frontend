# Data flow

How data gets from the Flask backend (Railway) to a chart on the page, and every place it is cached on the way. Plan steps 3 and 4 (`docs/ARCHITECTURE_PLAN.md`) consolidate this; update this file when they land.

## Request path

```
Browser
  React component
    → hook in src/hooks/            (React Query: caching, retries, loading/error state)
    → method in src/services/       (basketball-api.ts / football-api.ts, built on shared-request.ts)
    → fetch(apiUrl("<key>", params, query))   (src/api/urls.ts → /api/proxy/<path>/; same origin, no CORS, no redirect)
Vercel
  src/app/api/proxy/[...slug]/route.ts
    → looks the path up in src/api/endpoints.ts; checks method, path parameters and query
    → fetch(BACKEND_API_URL + backend path), with the entry's timeout (30 s GET; 1–5 min POST)
Railway
  Flask backend /api/...
```

Server-rendered first paint skips the browser leg: `page.tsx` calls a helper in `src/lib/server-api.ts`, which fetches the backend directly (`fetchEndpoint`, built from the same endpoint entries, parameters checked the same way) and passes the result to the client hook as React Query `initialData`. Today only some pages do this (e.g. `/football/wins/`, which makes zero browser data requests on load).

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

Two repositories share one API: this site (Vercel) and the Flask backend `jgt7405/jthom_prod_backend` (Railway). Railway and Vercel deploy independently, so for a while after any deploy the live site and the live backend can be one change apart, and returning visitors may run JavaScript from an older frontend deploy (service worker, open tabs). Every change has to work in that gap.

### Who owns what

| Part of the contract | Owner | Where it is written down |
|---|---|---|
| Which paths exist, their methods, path parameters and query parameters | **Frontend** | `src/api/endpoints.ts`. The proxy forwards nothing else, so a backend route the list doesn't name is unreachable from the site |
| Response bodies of every route (field names, types, nesting, units such as counts vs percentages) | **Backend** | Its route code. The frontend's copy is the TypeScript types in `src/types/` and next to the hooks and services, plus Zod schemas for the shared conference-table envelope in `src/api/schemas.ts` |
| POST request bodies (what-if selections, exports, uploads) | **Frontend** | Zod schemas in `src/api/schemas.ts`. The proxy forwards only the parsed body, so fields the site never sends don't reach the backend |
| Conference and team names | **Backend data** | Full conference names as stored (`Southeastern`, not `SEC`); the backend maps short names on the way in (`normalize_conference_name`). Team names as in `bball_league_hierarchy_flat` / `football_team_decode` |
| Seasons | Both | `YYYY-YY` (`2025-26`), checked by the proxy |
| Cache lifetimes | **Frontend** | The `cacheClass` of each entry (`docs/decisions/cache-classes.md`) |

### Changing a response shape (backend)

Changes are **additive first, removal last**:

1. **Adding a field** is always safe: deploy the backend, then use it in the frontend.
2. **Renaming or changing a field**: add the new field *alongside* the old one, deploy the backend, switch the frontend to the new field, and only then remove the old one (step 4).
3. **Removing a field** (or a route): only after the frontend has stopped reading it **and** that frontend has been live for at least **30 days**. Returning visitors can run cached JavaScript for that long. For a route, remove its entry from `src/api/endpoints.ts` first; the backend route goes 30 days later.
4. **Archived seasons are frozen.** A shape change must keep working for every season in the archive pickers, or the frontend has to handle both shapes. The backend tests' fixtures (`conftest.py`) should cover an archived season whenever a change touches `?season=` handling.

### Announcing a change

- A backend pull request that changes a response shape says so in its title (`API:` prefix) and lists the fields added, renamed or removed, with the frontend pull request that adapts to it. The frontend pull request links back.
- Merge order follows the steps above: backend first when adding, frontend first when removing.
- A new endpoint lands in the backend first. The frontend then adds the entry, client code and types, using the `add-endpoint` skill.

### What catches drift

- **Response schemas** (`src/api/schemas.ts`): the proxy checks responses that have one, currently the `{ data: [{ team_name, … }], conferences }` envelope of the ten conference-table endpoints. A mismatch logs `Backend response doesn't match its schema` (with the endpoint and first issues) in the Vercel logs, and the response is still served.
- **Proxy contract tests** (`src/app/api/proxy/[...slug]/__tests__/contract.test.ts`): the frontend only builds and forwards requests the list allows.
- **Backend route tests** (`tests/` in the backend, run with `pytest`): each route against fixture tables with the production column names, so a query that reads a renamed column fails.
- **The daily "Production baseline" workflow** (`scripts/proxy-probe.mjs --strict`) calls representative endpoints on the live site. It fails if any errors or returns an empty or non-JSON body, and a failed run emails the repo owner.
