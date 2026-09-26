// Builds a URL for the backend proxy route (src/app/api/proxy/[...slug]).
//
// `trailingSlash: true` in next.config.js makes Next answer any
// /api/proxy/<path> without a trailing slash with a 308 redirect, so every
// browser data call used to pay an extra round trip (docs/baselines/README.md,
// proxy probe). Build every proxy URL through this helper instead of by hand.
//
//   proxyUrl("football/standings/SEC")               -> /api/proxy/football/standings/SEC/
//   proxyUrl(`twv/${conf}?season=${season}`)         -> /api/proxy/twv/<conf>/?season=<season>
//   proxyUrl(`cfp/${team}/history${seasonQuery}`)    -> query string kept after the slash
export function proxyUrl(pathAndQuery: string): string {
  const queryStart = pathAndQuery.indexOf("?");
  const path = queryStart === -1 ? pathAndQuery : pathAndQuery.slice(0, queryStart);
  const query = queryStart === -1 ? "" : pathAndQuery.slice(queryStart);
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  return `/api/proxy/${trimmed}/${query}`;
}
