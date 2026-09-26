---
name: add-endpoint
description: Wire a new Flask backend endpoint into the frontend (proxy route, API client method, React Query hook, optional server-side fetch, types, test). Use when a page needs data from a backend URL the site doesn't call yet.
---

# Add a backend endpoint

The full checklist lives in `src/services/AGENTS.md`; read it first. Summary of the four places that must agree on the path:

1. `src/app/api/proxy/[...slug]/route.ts`: map the slug shape to the backend path. Validate user-supplied segments with `validatePathSegment`. Put the branch next to similar shapes (1-part, 2-part `<sport>/<name>`, conference routes, team history routes).
2. `src/services/basketball-api.ts` or `football-api.ts`: client method (sanitize and validate inputs, spaces → `_` in conference names, optional `?season=`), and the path prefix in the endpoint list in `shared-request.ts`.
3. `src/hooks/use<Thing>.ts`: `useQuery` with `queryKey: ["<resource>", ...params]`, `enabled` guard, optional `initialData`.
4. Optional: `src/lib/server-api.ts` helper plus `initialData` from `page.tsx` for server-rendered first paint.

Then: response types in `src/types/`, and an expected-URL case in `src/services/__tests__/api.integration.test.ts`.

## Verify

```bash
npm run verify
npm run build && npx next start -p 3100 &
curl -s http://localhost:3100/api/proxy/<your/path>/ | head -c 300
```

- Accepted by the proxy: the backend's data, or in a cloud session (backend blocked) `{"error":"Backend request failed: 403", ...}` naming your backend path.
- Not registered: `404` with `Unknown ...` or `Invalid URL structure`. Fix step 1.
- Note the trailing slash: without it you get a 308 redirect first. In code, always build the URL with `proxyUrl()` (`src/lib/proxy-url.ts`); the smoke tests fail on redirected proxy calls.

To check real data from a cloud session, add the path to `ENDPOINTS` in `scripts/proxy-probe.mjs` and run the "Production baseline" workflow after merging.
