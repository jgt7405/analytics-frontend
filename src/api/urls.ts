// URLs for backend endpoints, built from their entries in ./endpoints.ts
// (docs/ARCHITECTURE_PLAN.md step 4, item 3). Callers name an endpoint by
// key and pass its parameters, so a path can't drift from what the proxy
// accepts: a wrong key is a type error, a missing or invalid parameter or
// an unlisted query parameter throws.
//
//   apiUrl("football.standings", { conference: "SEC" }, { season })
//     -> /api/proxy/football/standings/SEC/?season=2025-26
//
// Server code fetching the backend directly uses backendRequest() instead
// (src/lib/server-api.ts). Imported by server and client code: keep it free
// of server-only imports.

import { proxyUrl } from "@/lib/proxy-url";
import {
  ENDPOINTS,
  buildBackendPath,
  isValidParam,
  isValidQueryValue,
  type Endpoint,
  type EndpointKey,
  type QueryParam,
} from "./endpoints";

export type EndpointParams = Readonly<Record<string, string>>;
/** Query parameters; undefined, null and "" are left out. */
export type EndpointQuery = Partial<Record<QueryParam, string | null | undefined>>;

const BY_KEY = new Map<string, Endpoint>(ENDPOINTS.map((e) => [e.key, e]));

export function endpointFor(key: EndpointKey): Endpoint {
  const endpoint = BY_KEY.get(key);
  if (!endpoint) throw new Error(`Unknown endpoint ${key}`);
  return endpoint;
}

function checkParams(endpoint: Endpoint, params: EndpointParams) {
  const expected = Object.keys(endpoint.params);
  for (const name of Object.keys(params)) {
    if (!expected.includes(name)) {
      throw new Error(`${endpoint.key} has no parameter "${name}"`);
    }
  }
  for (const name of expected) {
    const value = params[name];
    if (value === undefined) throw new Error(`${endpoint.key} needs parameter "${name}"`);
    if (!isValidParam(endpoint.params[name], value)) {
      throw new Error(`${endpoint.key}: invalid ${name} "${value}"`);
    }
  }
}

function queryString(endpoint: Endpoint, query: EndpointQuery): string {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (!(endpoint.allowedQuery as readonly string[]).includes(name)) {
      throw new Error(`${endpoint.key} doesn't accept ?${name}=`);
    }
    if (!isValidQueryValue(name as QueryParam, value)) {
      throw new Error(`${endpoint.key}: invalid ${name} "${value}"`);
    }
    search.set(name, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * The path under /api/proxy/ for an endpoint (its first proxy path) with the
 * query string, e.g. "football/standings/SEC?season=2025-26". Parameters are
 * URL-encoded; format them as the endpoint expects (conference names with
 * `_` for spaces) before passing them.
 */
export function apiPath(
  key: EndpointKey,
  params: EndpointParams = {},
  query: EndpointQuery = {},
): string {
  const endpoint = endpointFor(key);
  checkParams(endpoint, params);
  const path = endpoint.proxyPaths[0].replace(/:(\w+)/g, (_, name: string) =>
    encodeURIComponent(params[name]),
  );
  return `${path}${queryString(endpoint, query)}`;
}

/** The browser URL for an endpoint: /api/proxy/<path>/?<query>. */
export function apiUrl(
  key: EndpointKey,
  params: EndpointParams = {},
  query: EndpointQuery = {},
): string {
  return proxyUrl(apiPath(key, params, query));
}

/**
 * The backend path and query for an endpoint, as the proxy would forward it
 * (e.g. "/football_seed/SEC?season=2025-26"). For server code that calls the
 * backend directly.
 */
export function backendRequest(
  key: EndpointKey,
  params: EndpointParams = {},
  query: EndpointQuery = {},
): { endpoint: Endpoint; path: string } {
  const endpoint = endpointFor(key);
  checkParams(endpoint, params);
  return {
    endpoint,
    path: `${buildBackendPath(endpoint, params)}${queryString(endpoint, query)}`,
  };
}
