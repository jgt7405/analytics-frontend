# src/services — API clients

Browser-side clients for the backend, all going through `/api/proxy` (see `docs/data-flow.md`).

- `shared-request.ts`: `BaseApiClient.request(endpoint, validator?)` — fetch, retries with backoff, error mapping to user-friendly messages, monitoring. Also holds `BASKETBALL_ENDPOINTS` / `FOOTBALL_ENDPOINTS` (a soft allowlist: unknown endpoints only log a warning).
- `basketball-api.ts` → `BasketballApiClient`; `football-api.ts` → `ApiClient extends BasketballApiClient` and the `api` singleton.
- `api.ts`: re-exports for older imports. Import `api` from `@/services/api` in new code.

## Adding a backend endpoint (until step 4's endpoint list replaces this)

1. **Proxy** — `src/app/api/proxy/[...slug]/route.ts`: add a branch or `case` that maps the incoming slug shape to the backend path. Validate any user-supplied segment with `validatePathSegment`. Unmatched shapes return 404, so skipping this step fails silently in the UI.
2. **Client** — add a method to `basketball-api.ts` or `football-api.ts`: sanitize/validate inputs (`sanitizeInput`, `validateConference` from `@/lib/validation`), convert spaces to `_` for conference names, append `?season=` when given, then `this.request(path, validator)`. `request()` turns the path into a URL with `proxyUrl()`; code outside the services (hooks, components) must call `proxyUrl()` itself rather than writing `/api/proxy/...` by hand. Add the path prefix to the endpoint list in `shared-request.ts`.
3. **Hook** — `src/hooks/use<Thing>.ts` with `useQuery`: `queryKey: queryKeys.<sport>.<resource>(...params)` (add the entry to `src/lib/query-keys.ts`, listing every parameter the fetch uses), `enabled` guards, an optional `initialData` parameter, and `...queryCachePolicy("<class>")` (`src/lib/cache-policy.ts`; classes in `docs/decisions/cache-classes.md`). Check that `cacheClassForBackendPath()` puts the backend path in the same class.
4. **Server first paint (optional)** — add a helper in `src/lib/server-api.ts` returning the same shape, and pass its result from `page.tsx` as `initialData`.
5. **Types** — response types in `src/types/<sport>.ts` or next to the client method.
6. **Tests** — extend `src/services/__tests__/api.integration.test.ts` with the expected URL.

Keep the path consistent across all four places; the proxy is the one most often missed.
