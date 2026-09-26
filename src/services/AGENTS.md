# src/services — API clients

Browser-side clients for the backend, all going through `/api/proxy` (see `docs/data-flow.md`).

- `shared-request.ts`: `BaseApiClient.request(endpoint, validator?)` — fetch, retries with backoff, error mapping to user-friendly messages, monitoring. Warns in the console when a path isn't in the endpoint list (`src/api/endpoints.ts`); the proxy rejects it anyway.
- `basketball-api.ts` → `BasketballApiClient`; `football-api.ts` → `ApiClient extends BasketballApiClient` and the `api` singleton.
- `api.ts`: re-exports for older imports. Import `api` from `@/services/api` in new code.

## Adding a backend endpoint

1. **Endpoint list** — `src/api/endpoints.ts`: add a `get(...)` or `post(...)` entry: the proxy path the client will call, the backend path, a rule for each `:param` (`segment`, `conference` — spaces become `_` — or `team`), any query parameters besides `season`, and the cache class (`docs/decisions/cache-classes.md`). The proxy (`src/app/api/proxy/[...slug]/route.ts`) reads this list; it has no per-endpoint code. Unregistered paths, methods and query parameters are rejected (404/405/400), so skipping this step fails in the UI.
2. **Client** — add a method to `basketball-api.ts` or `football-api.ts`: sanitize/validate inputs (`sanitizeInput`, `validateConference` from `@/lib/validation`), convert spaces to `_` for conference names, append `?season=` when given, then `this.request(path, validator)`. `request()` turns the path into a URL with `proxyUrl()`; code outside the services (hooks, components) must call `proxyUrl()` itself rather than writing `/api/proxy/...` by hand.
3. **Hook** — `src/hooks/use<Thing>.ts` with `useQuery`: `queryKey: queryKeys.<sport>.<resource>(...params)` (add the entry to `src/lib/query-keys.ts`, listing every parameter the fetch uses), `enabled` guards, an optional `initialData` parameter, and `...queryCachePolicy("<class>")` (`src/lib/cache-policy.ts`; classes in `docs/decisions/cache-classes.md`). Use the same class as the endpoint's entry.
4. **Server first paint (optional)** — add a helper in `src/lib/server-api.ts` returning the same shape, and pass its result from `page.tsx` as `initialData`. Its cache lifetime comes from the endpoint entry matching the backend path; an unregistered path is fetched uncached and logged.
5. **Types** — response types in `src/types/<sport>.ts` or next to the client method.
6. **Tests** — extend `src/services/__tests__/api.integration.test.ts` with the expected URL.

Keep the path consistent between the endpoint entry and the callers; `src/api/__tests__/endpoints.test.ts` checks that entries are well-formed.
