// Every backend endpoint the site may call through /api/proxy, with its
// security boundary and behavior (docs/ARCHITECTURE_PLAN.md step 4). The proxy
// accepts only what is listed here: the path shape, the method, each path
// parameter's rule and the query parameters. Anything else is rejected.
//
// Adding an endpoint: add an entry here, then a client method or hook
// (src/services/AGENTS.md). The contract tests check the rest.
//
// Imported by server and client code: keep it free of runtime imports.

import type { CacheClass } from "@/lib/cache-policy";

export type Sport = "basketball" | "football";
export type HttpMethod = "GET" | "POST";

/**
 * How a `:param` path segment is validated and passed on. Values arrive
 * URL-decoded; they are re-encoded when the backend URL is built.
 * - `segment`: a conference or other name, passed on unchanged.
 * - `conference`: same characters, spaces become `_` (the backend's form).
 * - `team`: a team name, which may also contain `&`, `'` and parentheses
 *   ("Texas A&M", "St. John's", "Miami (OH)").
 */
export type ParamRule = "segment" | "conference" | "team";

export type QueryParam = "season" | "mode" | "date";

export interface Endpoint {
  /** Unique id, `<sport>.<name>`. */
  key: string;
  sport: Sport;
  method: HttpMethod;
  /** Paths under /api/proxy/ without leading or trailing slashes; `:name`
   *  segments are parameters. The first is the one the site calls, the rest
   *  are older aliases kept working. */
  proxyPaths: readonly string[];
  /** Backend path under BACKEND_API_URL, with the same `:name` parameters. */
  backendPath: string;
  params: Readonly<Record<string, ParamRule>>;
  /** Query parameters forwarded to the backend; any other one is rejected. */
  allowedQuery: readonly QueryParam[];
  /** Backend request timeout in the proxy. */
  timeoutMs: number;
  /** Freshness class (src/lib/cache-policy.ts); an archived `?season=`
   *  makes a GET `historical`. */
  cacheClass: CacheClass;
  /** POST request body. */
  body?: "json" | "formData";
  response: "json" | "csv";
  /** The response can be streamed through unchanged (plan step 9). */
  passthroughEligible: boolean;
}

// --- Rules ------------------------------------------------------------------

const MAX_PARAM_LENGTH = 80;
const PARAM_PATTERNS: Record<ParamRule, RegExp> = {
  segment: /^[A-Za-z0-9_ .-]+$/,
  conference: /^[A-Za-z0-9_ .-]+$/,
  team: /^[\p{L}\p{N}_ .'&()-]+$/u,
};

export function isValidParam(rule: ParamRule, value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_PARAM_LENGTH &&
    PARAM_PATTERNS[rule].test(value) &&
    !/^\.+$/.test(value) // "." and ".." would walk up the backend path
  );
}

const QUERY_PATTERNS: Record<QueryParam, RegExp> = {
  season: /^\d{4}-\d{2}$/,
  mode: /^(season|current)$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
};

export function isValidQueryValue(name: QueryParam, value: string): boolean {
  return QUERY_PATTERNS[name].test(value);
}

// --- The list ---------------------------------------------------------------

const S = 1000;
const GET_TIMEOUT = 30 * S;

function get<K extends string, S extends Sport>(
  key: K,
  sport: S,
  proxyPaths: readonly string[],
  backendPath: string,
  cacheClass: CacheClass,
  options: {
    params?: Record<string, ParamRule>;
    query?: readonly QueryParam[];
    response?: "json" | "csv";
  } = {},
): Endpoint & { key: `${S}.${K}` } {
  return {
    key: `${sport}.${key}`,
    sport,
    method: "GET",
    proxyPaths,
    backendPath,
    params: options.params ?? {},
    allowedQuery: options.query ?? ["season"],
    timeoutMs: GET_TIMEOUT,
    cacheClass,
    response: options.response ?? "json",
    passthroughEligible: true,
  };
}

function post<K extends string, S extends Sport>(
  key: K,
  sport: S,
  path: string,
  timeoutMs: number,
  options: { body?: "json" | "formData"; response?: "json" | "csv" } = {},
): Endpoint & { key: `${S}.${K}` } {
  return {
    key: `${sport}.${key}`,
    sport,
    method: "POST",
    proxyPaths: [path],
    backendPath: `/${path}`,
    params: {},
    allowedQuery: ["season"],
    timeoutMs,
    cacheClass: "scenario",
    body: options.body ?? "json",
    response: options.response ?? "json",
    passthroughEligible: false,
  };
}

const conference = { conference: "segment" } as const;
const conferenceUnderscored = { conference: "conference" } as const;
const team = { team: "team" } as const;

// Order matters only where two shapes of the same length could both match
// (e.g. `standings/:conference/history` before `standings/json/:conference`);
// the first match wins, and the contract tests check no route is shadowed.
export const ENDPOINTS = [
  // --- Basketball -----------------------------------------------------------
  get("teams", "basketball", ["basketball_teams", "teams", "basketball/teams"], "/basketball_teams", "referenceData"),
  get("conferenceData", "basketball", ["unified_conference_data", "basketball/conf-data"], "/unified_conference_data", "currentStandings"),
  get("conferenceDataHistory", "basketball", ["unified_conference_data/history"], "/unified_conference_data/history", "historical"),
  get("standingsHistory", "basketball", ["standings/:conference/history"], "/standings/:conference/history", "historical", { params: conferenceUnderscored }),
  get("standingsJson", "basketball", ["standings/json/:conference"], "/standings/json/:conference", "currentStandings", { params: conferenceUnderscored }),
  get("standings", "basketball", ["standings/:conference"], "/standings/:conference", "currentStandings", { params: conference }),
  get("cwv", "basketball", ["cwv/:conference"], "/cwv/:conference", "currentStandings", { params: conference }),
  get("confSchedule", "basketball", ["conf_schedule/:conference"], "/conf_schedule/:conference", "currentStandings", { params: conference }),
  get("twv", "basketball", ["twv/:conference"], "/twv/:conference", "currentStandings", { params: conference }),
  get("confTourneyHistory", "basketball", ["conf_tourney/:conference/history"], "/conf_tourney/:conference/history", "historical", { params: conferenceUnderscored }),
  get("confTourney", "basketball", ["conf_tourney/:conference"], "/conf_tourney/:conference", "currentStandings", { params: conference }),
  get("seed", "basketball", ["seed/:conference"], "/seed/:conference", "currentStandings", { params: conference }),
  get("ncaaTourney", "basketball", ["ncaa_tourney/:conference"], "/ncaa_tourney/:conference", "currentStandings", { params: conference }),
  get("team", "basketball", ["team/:team"], "/team/:team", "currentStandings", { params: team }),
  get("teamConfWinsHistory", "basketball", ["basketball/team/:team/history/conf_wins"], "/basketball/team/:team/history/conf_wins", "historical", { params: team }),
  get("teamNcaaHistory", "basketball", ["basketball/ncaa/:team/history"], "/basketball/ncaa/:team/history", "historical", { params: team }),
  get("nonconfAnalysis", "basketball", ["basketball/nonconf_analysis/:conference"], "/basketball/nonconf_analysis/:conference", "currentStandings", { params: conference }),
  get("confChampAnalysis", "basketball", ["basketball/conf_champ_analysis/:conference"], "/basketball/conf_champ_analysis/:conference", "currentStandings", { params: conference }),
  get("ncaaProjections", "basketball", ["basketball/ncaa-projections"], "/basketball/ncaa-projections", "currentStandings", { query: ["season", "mode"] }),
  get("upcomingGames", "basketball", ["basketball/upcoming_games"], "/basketball/upcoming_games", "live"),
  get("compositeRatings", "basketball", ["basketball/composite_ratings"], "/basketball/composite_ratings", "currentStandings"),
  get("seasonHighlights", "basketball", ["basketball/season_highlights"], "/basketball/season_highlights", "currentStandings"),
  // Chart page's "Download Team Schedule": the whole schedule table as a file.
  get("teamScheduleCsv", "basketball", ["basketball/team_schedule/csv"], "/basketball/team_schedule/csv", "currentStandings", { query: [], response: "csv" }),

  post("whatIf", "basketball", "basketball/whatif", 120 * S),
  post("whatIfBaseline", "basketball", "basketball/whatif/baseline", 60 * S),
  post("nextGameImpact", "basketball", "basketball/whatif/next-game-impact", 120 * S),
  post("whatIfValidationCsv", "basketball", "basketball/whatif/validation-csv", 300 * S, { response: "csv" }),
  post("chartUpload", "basketball", "basketball/chart/upload", 300 * S, { body: "formData" }),

  // --- Football -------------------------------------------------------------
  get("teams", "football", ["football_teams", "football/teams"], "/football_teams", "referenceData"),
  get("conferenceData", "football", ["football_conf_data", "football/conf-data"], "/football_conf_data", "currentStandings"),
  get("conferenceDataHistory", "football", ["football_conf_data/history"], "/football_conf_data/history", "historical"),
  get("standingsHistory", "football", ["football/standings/:conference/history"], "/football/standings/:conference/history", "historical", { params: conferenceUnderscored }),
  get("standings", "football", ["football/standings/:conference"], "/football/standings/:conference", "currentStandings", { params: conference }),
  get("cwv", "football", ["football/cwv/:conference"], "/football/cwv/:conference", "currentStandings", { params: conference }),
  get("confSchedule", "football", ["football/conf_schedule/:conference"], "/football/conf_schedule/:conference", "currentStandings", { params: conference }),
  get("twv", "football", ["football/twv/:conference"], "/football/twv/:conference", "currentStandings", { params: conference }),
  get("confChamp", "football", ["football/conf_champ/:conference", "football/conf-champ/:conference"], "/football/conf_champ/:conference", "currentStandings", { params: conference }),
  get("seed", "football", ["football_seed/:conference", "football/seed/:conference"], "/football_seed/:conference", "currentStandings", { params: conference }),
  get("cfpHistory", "football", ["cfp/:team/history", "football/cfp/:team/history"], "/cfp/:team/history", "historical", { params: team }),
  get("cfp", "football", ["cfp/:conference", "football/cfp/:conference"], "/cfp/:conference", "currentStandings", { params: conference }),
  get("team", "football", ["football_team/:team", "football/team/:team"], "/football_team/:team", "currentStandings", { params: team }),
  get("teamConfWinsHistory", "football", ["football/team/:team/history/conf_wins"], "/football/team/:team/history/conf_wins", "historical", { params: team }),
  // The site sends `All_Teams` as a placeholder; the backend path has none.
  get("playoffRankings", "football", ["football/playoff_rankings/All_Teams"], "/football/playoff_rankings", "currentStandings", { query: ["season", "mode"] }),
  get("compositeRatings", "football", ["football/composite_ratings"], "/football/composite_ratings", "currentStandings"),
  get("compositeRatingsDates", "football", ["football/composite_ratings/dates"], "/football/composite_ratings/dates", "currentStandings"),
  get("compositeRatingsHistory", "football", ["football/composite_ratings/history"], "/football/composite_ratings/history", "historical", { query: ["season", "date"] }),
  get("futureGames", "football", ["football/future_games"], "/football/future_games", "live"),
  get("allFutureGames", "football", ["football/all_future_games"], "/football/all_future_games", "live"),
  get("seasonHighlights", "football", ["football/season_highlights"], "/football/season_highlights", "currentStandings"),
  get("bowlPicks", "football", ["football/bowl-picks"], "/football/bowl-picks", "live"),
  get("bowlScoreboard", "football", ["football/bowl-scoreboard"], "/football/bowl-scoreboard", "live"),

  post("whatIf", "football", "football/whatif", 120 * S),
  post("whatIfExport", "football", "football/whatif/export", 300 * S),
  post("whatIfStructuredCsv", "football", "football/whatif/structured-csv", 120 * S),
  post("whatIfDownload", "football", "football/whatif/download", 120 * S),
  post("gameImpacts", "football", "football/whatif/game-impacts", 240 * S),
] as const satisfies readonly Endpoint[];

/** Every endpoint key, e.g. "football.standings". */
export type EndpointKey = (typeof ENDPOINTS)[number]["key"];

// --- Matching ---------------------------------------------------------------

export type EndpointMatch =
  | { kind: "ok"; endpoint: Endpoint; params: Record<string, string> }
  /** The path is registered, but a parameter breaks its rule. */
  | { kind: "invalidParam"; endpoint: Endpoint; param: string }
  /** The path is registered for other methods only. */
  | { kind: "methodNotAllowed"; allowed: HttpMethod[] }
  | { kind: "notFound" };

function matchPattern(
  pattern: string,
  segments: readonly string[],
): Record<string, string> | null {
  const parts = pattern.split("/");
  if (parts.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(":")) params[parts[i].slice(1)] = segments[i];
    else if (parts[i] !== segments[i]) return null;
  }
  return params;
}

/**
 * Finds the endpoint for a proxy request. `segments` are the URL-decoded path
 * segments after /api/proxy/ (the route's `slug`).
 */
export function matchEndpoint(
  method: string,
  segments: readonly string[],
): EndpointMatch {
  const allowed = new Set<HttpMethod>();
  for (const endpoint of ENDPOINTS) {
    for (const pattern of endpoint.proxyPaths) {
      const params = matchPattern(pattern, segments);
      if (!params) continue;
      if (endpoint.method !== method) {
        allowed.add(endpoint.method);
        continue;
      }
      for (const [name, value] of Object.entries(params)) {
        if (!isValidParam(endpoint.params[name], value)) {
          return { kind: "invalidParam", endpoint, param: name };
        }
      }
      return { kind: "ok", endpoint, params };
    }
  }
  return allowed.size > 0
    ? { kind: "methodNotAllowed", allowed: [...allowed] }
    : { kind: "notFound" };
}

/** The backend path for validated params, each segment URL-encoded. */
export function buildBackendPath(
  endpoint: Endpoint,
  params: Readonly<Record<string, string>>,
): string {
  return endpoint.backendPath.replace(/:(\w+)/g, (_, name: string) => {
    const value = params[name];
    const formatted =
      endpoint.params[name] === "conference" ? value.replace(/\s+/g, "_") : value;
    return encodeURIComponent(formatted);
  });
}

export type QueryCheck =
  | { ok: true; query: URLSearchParams }
  | { ok: false; param: string };

/** Keeps the endpoint's allowed query parameters; rejects any other one and
 *  malformed values. Empty values are dropped, as before. */
export function checkQuery(
  endpoint: Endpoint,
  searchParams: URLSearchParams,
): QueryCheck {
  const query = new URLSearchParams();
  for (const [name, value] of searchParams) {
    const allowed = (endpoint.allowedQuery as readonly string[]).includes(name);
    if (!allowed) return { ok: false, param: name };
    if (value === "") continue;
    if (!isValidQueryValue(name as QueryParam, value) || query.has(name)) {
      return { ok: false, param: name };
    }
    query.set(name, value);
  }
  return { ok: true, query };
}
