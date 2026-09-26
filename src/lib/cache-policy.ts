// Named freshness classes (docs/ARCHITECTURE_PLAN.md step 3;
// docs/decisions/cache-classes.md). Every layer that caches backend data
// reads its settings from here, so a class's freshness is set in one place:
//
//   browser   React Query staleTime / gcTime  (hooks: ...queryCachePolicy(...))
//   server    fetch `next.revalidate`          (src/lib/server-api.ts)
//   CDN       Cache-Control on /api/proxy       (src/app/api/proxy/[...slug]/route.ts)
//
// Error responses are never cached, whatever the class.
//
// Imported by both server and client code: keep it free of runtime imports.

export type CacheClass =
  | "live"
  | "currentStandings"
  | "historical"
  | "referenceData"
  | "scenario";

interface CachePolicy {
  /** React Query: how long data counts as fresh in the browser (ms). */
  staleTime: number;
  /** React Query: how long unused data stays in memory (ms). */
  gcTime: number;
  /** Server fetches: `next.revalidate` in seconds; 0 means never cached. */
  revalidate: number;
  /** Cache-Control on successful proxy responses. `s-maxage` is for the CDN;
   *  Vercel doesn't pass it on to browsers, which rely on React Query. */
  cacheControl: string;
}

const MINUTE = 60 * 1000;

export const CACHE_POLICIES: Record<CacheClass, CachePolicy> = {
  // Upcoming and in-progress games, bowl scoreboard.
  live: {
    staleTime: 30 * 1000,
    gcTime: 5 * MINUTE,
    revalidate: 30,
    cacheControl: "public, s-maxage=30, stale-while-revalidate=30",
  },
  // Standings, projections, seeds, team pages: the backend recomputes these
  // a few times a day at most.
  currentStandings: {
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
    revalidate: 300,
    cacheControl: "public, s-maxage=300, stale-while-revalidate=600",
  },
  // History charts and archived seasons: append-only or frozen.
  historical: {
    staleTime: 60 * MINUTE,
    gcTime: 120 * MINUTE,
    revalidate: 3600,
    cacheControl: "public, s-maxage=3600, stale-while-revalidate=86400",
  },
  // Team and conference lists: change at season rollover.
  referenceData: {
    staleTime: 24 * 60 * MINUTE,
    gcTime: 24 * 60 * MINUTE,
    revalidate: 86400,
    cacheControl: "public, s-maxage=86400, stale-while-revalidate=604800",
  },
  // What-if calculations and exports: per-user input, never in a shared cache.
  scenario: {
    staleTime: 0,
    gcTime: 5 * MINUTE,
    revalidate: 0,
    cacheControl: "private, no-store",
  },
};

/** Spread into a `useQuery` call: `...queryCachePolicy("historical")`. */
export function queryCachePolicy(cacheClass: CacheClass) {
  const { staleTime, gcTime } = CACHE_POLICIES[cacheClass];
  return { staleTime, gcTime };
}

// Seasons whose data no longer changes, per sport, as passed in `?season=`.
// Requests for them are cached as `historical`. Leaving a finished season out
// only costs cache hits; listing the current one would serve stale data, so
// update this at season rollover (until step 6's season config replaces it).
// Basketball 2025-26 is still served as the current season (next.config.js).
const ARCHIVED_SEASONS: Record<"basketball" | "football", readonly string[]> = {
  basketball: [],
  football: ["2025-26"],
};

const LIVE_PATHS = [
  /^\/basketball\/upcoming_games/,
  /^\/football\/(all_)?future_games/,
  /^\/football\/bowl-(picks|scoreboard)/,
  /^\/football\/debug\//,
];
const REFERENCE_PATHS = [/^\/(basketball|football)_teams$/];

/**
 * Cache class for a GET to a backend path (as sent to the Flask API, without
 * the query string), e.g. `/football/standings/SEC`. POSTs are `scenario`.
 */
export function cacheClassForBackendPath(
  backendPath: string,
  season?: string | null,
): CacheClass {
  if (REFERENCE_PATHS.some((re) => re.test(backendPath))) return "referenceData";
  const sport = /^\/(football|cfp)/.test(backendPath) ? "football" : "basketball";
  if (season && ARCHIVED_SEASONS[sport].includes(season)) return "historical";
  if (LIVE_PATHS.some((re) => re.test(backendPath))) return "live";
  if (/\/history(\/|$)/.test(backendPath)) return "historical";
  return "currentStandings";
}
