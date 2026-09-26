---
name: add-endpoint
description: Wire a new Flask backend endpoint into the frontend (endpoint list entry, API client method, React Query hook, optional server-side fetch, types, test). Use when a page needs data from a backend URL the site doesn't call yet.
---

# Add a backend endpoint

The full checklist lives in `src/services/AGENTS.md`; read it first. Summary of the places that must agree on the path:

1. `src/api/endpoints.ts`: one `get(...)`/`post(...)` entry with the proxy path, backend path, a rule per `:param` (`segment`, `conference`, `team`), extra query parameters beyond `season`, and the cache class. The proxy reads only this list.
2. `src/services/basketball-api.ts` or `football-api.ts`: client method (sanitize and validate inputs, spaces → `_` in conference names, optional `?season=`).
3. `src/hooks/use<Thing>.ts`: `useQuery` with `queryKey: queryKeys.<sport>.<resource>(...params)` (add the entry to `src/lib/query-keys.ts` with every parameter the fetch uses; inline key arrays fail lint), `enabled` guard, optional `initialData`, and `...queryCachePolicy("<class>")` from `@/lib/cache-policy`. Pick the class from `docs/decisions/cache-classes.md`; it must match the entry's `cacheClass`, which the CDN and server fetches use.
4. Optional: `src/lib/server-api.ts` helper plus `initialData` from `page.tsx` for server-rendered first paint.

Then: response types in `src/types/`, and an expected-URL case in `src/services/__tests__/api.integration.test.ts`. The contract tests pick up the new entry automatically, and `callers.test.ts` fails if a call site builds a URL no entry matches.

## Verify

```bash
npm run verify
npm run build && npx next start -p 3100 &
curl -s http://localhost:3100/api/proxy/<your/path>/ | head -c 300
```

- Accepted by the proxy: the backend's data, or in a cloud session (backend blocked) `{"error":"Backend request failed: 403", ...}` naming your backend path.
- Not registered: `404 Unknown endpoint`, `405` (wrong method), or `400` (a parameter or query parameter breaks its rule). Fix step 1.
- Note the trailing slash: without it you get a 308 redirect first. In code, always build the URL with `proxyUrl()` (`src/lib/proxy-url.ts`); the smoke tests fail on redirected proxy calls.

To check real data from a cloud session, add the path to `ENDPOINTS` in `scripts/proxy-probe.mjs` and run the "Production baseline" workflow after merging.
