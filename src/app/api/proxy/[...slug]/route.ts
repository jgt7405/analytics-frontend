import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL } from "@/config/env";
import { CACHE_POLICIES, cacheClassForBackendPath } from "@/lib/cache-policy";
import { logger } from "@/lib/logger";

// Force Node.js runtime and disable static optimization
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Helper: Validate path segment to prevent injection attacks.
 * Allows: alphanumeric, underscores, hyphens, spaces, periods.
 * Rejects: special chars, path traversal, null bytes.
 */
function validatePathSegment(segment: string): boolean {
  if (!segment || typeof segment !== "string") return false;
  return /^[A-Za-z0-9_\-\s.]+$/.test(segment);
}

/**
 * Helper: Forward whitelisted query parameters (season, mode) from the
 * incoming request to the backend URL. Returns "" when none are present.
 */
function getForwardedQueryString(request: NextRequest): string {
  const forwarded = new URLSearchParams();
  for (const key of ["season", "mode", "date"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) forwarded.set(key, value);
  }
  const qs = forwarded.toString();
  return qs ? `?${qs}` : "";
}

type RouteContext = { params: Promise<{ slug: string[] }> };

// Cache headers that don't depend on the endpoint are applied here, so no
// return path can miss them (src/lib/cache-policy.ts): error responses are
// never cached, and POSTs are scenarios, never kept in a shared cache.
export async function GET(request: NextRequest, context: RouteContext) {
  const started = Date.now();
  const response = await handleGet(request, context);
  if (!response.ok) response.headers.set("Cache-Control", "no-store");
  logRequest(request, response, started);
  return response;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const started = Date.now();
  const response = await handlePost(request, context);
  response.headers.set(
    "Cache-Control",
    response.ok ? CACHE_POLICIES.scenario.cacheControl : "no-store",
  );
  logRequest(request, response, started);
  return response;
}

// One line per proxied request (a CDN hit never reaches this function, so
// every line is a cache miss). requestId is Vercel's x-vercel-id, which
// Vercel also returns to the browser, so a user-reported request can be
// found in the logs.
function logRequest(request: NextRequest, response: Response, started: number) {
  logger.info("proxy", {
    method: request.method,
    path: `${request.nextUrl.pathname}${request.nextUrl.search}`,
    status: response.status,
    durationMs: Date.now() - started,
    cacheClass: response.headers.get("x-cache-class"),
    requestId: request.headers.get("x-vercel-id"),
  });
}

async function handleGet(_request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    // Production by default; set BACKEND_API_URL (src/config/env.ts) to point
    // at a local backend, e.g. http://localhost:5000/api.
    const BACKEND_BASE_URL = BACKEND_API_URL;

    let backendPath = "";

    // Handle single endpoint with no conference
    if (slug.length === 1) {
      const [endpoint] = slug;

      switch (endpoint) {
        case "unified_conference_data":
          backendPath = `/unified_conference_data`;
          break;
        case "football_conf_data":
          backendPath = `/football_conf_data`;
          break;
        case "football_teams":
          backendPath = `/football_teams`;
          break;
        case "basketball_teams":
        case "teams":
          backendPath = `/basketball_teams`;
          break;
        case "team_schedule":
          backendPath = `/team-schedule`;
          break;
        default:
          return NextResponse.json(
            { error: "Unknown single endpoint" },
            { status: 404 },
          );
      }
    }
    // Handle 5-part routes with history: football/team/BYU/history/conf_wins
    else if (
      slug.length === 5 &&
      slug[0] === "football" &&
      slug[1] === "team" &&
      slug[3] === "history"
    ) {
      const [, , teamName, , historyType] = slug;

      if (!validatePathSegment(teamName) || !validatePathSegment(historyType)) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }

      switch (historyType) {
        case "conf_wins":
          backendPath = `/football/team/${teamName}/history/conf_wins`;
          break;
        case "sagarin_rank":
          backendPath = `/football/team/${teamName}/history/sagarin_rank`;
          break;
        default:
          return NextResponse.json(
            { error: "Unknown football team history endpoint" },
            { status: 404 },
          );
      }
    }
    // Handle 5-part basketball team history routes: basketball/team/Duke/history/conf_wins
    else if (
      slug.length === 5 &&
      slug[0] === "basketball" &&
      slug[1] === "team" &&
      slug[3] === "history"
    ) {
      const [, , teamName, , historyType] = slug;

      if (!validatePathSegment(teamName) || !validatePathSegment(historyType)) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }

      switch (historyType) {
        case "conf_wins":
          backendPath = `/basketball/team/${teamName}/history/conf_wins`;
          break;
        default:
          return NextResponse.json(
            { error: "Unknown basketball team history endpoint" },
            { status: 404 },
          );
      }
    }
    // Handle 4-part basketball NCAA history routes: basketball/ncaa/Duke/history
    else if (
      slug.length === 4 &&
      slug[0] === "basketball" &&
      slug[1] === "ncaa" &&
      slug[3] === "history"
    ) {
      const [, , teamName] = slug;
      if (!validatePathSegment(teamName)) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }
      backendPath = `/basketball/ncaa/${teamName}/history`;
    }
    // Handle 4-part CFP team history routes: football/cfp/BYU/history
    else if (
      slug.length === 4 &&
      slug[0] === "football" &&
      slug[1] === "cfp" &&
      slug[3] === "history"
    ) {
      const [, , teamName] = slug;
      if (!validatePathSegment(teamName)) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }
      backendPath = `/cfp/${teamName}/history`;
    }
    // Handle 4-part routes with history: football/standings/Big_12/history
    else if (
      slug.length === 4 &&
      slug[0] === "football" &&
      slug[3] === "history"
    ) {
      const [, footballEndpoint, footballConference] = slug;
      if (!validatePathSegment(footballConference)) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }
      const formattedConference = footballConference.replace(/\s+/g, "_");

      switch (footballEndpoint) {
        case "standings":
          backendPath = `/football/standings/${formattedConference}/history`;
          break;
        default:
          return NextResponse.json(
            { error: "Unknown football history endpoint" },
            { status: 404 },
          );
      }
    }
    // Handle 3-part CFP history routes: cfp/Big_12/history
    else if (slug.length === 3 && slug[0] === "cfp" && slug[2] === "history") {
      const [, conference] = slug;
      if (!validatePathSegment(conference)) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }
      backendPath = `/cfp/${conference}/history`;
    }
    // Handle 3-part basketball history routes: standings/Big_12/history
    else if (
      slug.length === 3 &&
      slug[0] === "standings" &&
      slug[2] === "history"
    ) {
      const [, conference] = slug; // Get the conference from position 1
      if (!validatePathSegment(conference)) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }
      const formattedConference = conference.replace(/\s+/g, "_");
      backendPath = `/standings/${formattedConference}/history`;
    } else if (
      slug.length === 3 &&
      slug[0] === "conf_tourney" &&
      slug[2] === "history"
    ) {
      const [, conference] = slug;
      if (!validatePathSegment(conference)) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }
      const formattedConference = conference.replace(/\s+/g, "_");
      backendPath = `/conf_tourney/${formattedConference}/history`;
    }
    // Handle 3-part JSON standings routes: standings/json/Big_Ten
    else if (
      slug.length === 3 &&
      slug[0] === "standings" &&
      slug[1] === "json"
    ) {
      const [, , conference] = slug;
      if (!validatePathSegment(conference)) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }
      const formattedConference = conference.replace(/\s+/g, "_");
      backendPath = `/standings/json/${formattedConference}`;
    }
    // Handle 3-part basketball nonconf analysis routes: basketball/nonconf_analysis/All_Teams
    else if (
      slug.length === 3 &&
      slug[0] === "basketball" &&
      slug[1] === "nonconf_analysis"
    ) {
      const [, , conference] = slug;
      if (!validatePathSegment(conference)) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }
      backendPath = `/basketball/nonconf_analysis/${conference}`;
    }
    // Handle 3-part basketball conference championship analysis routes: basketball/conf_champ_analysis/ACC
    else if (
      slug.length === 3 &&
      slug[0] === "basketball" &&
      slug[1] === "conf_champ_analysis"
    ) {
      const [, , conference] = slug;
      if (!validatePathSegment(conference)) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }
      backendPath = `/basketball/conf_champ_analysis/${conference}`;
    }
    // Handle 3-part football routes: football/standings/Big_12
    else if (slug.length === 3 && slug[0] === "football") {
      const [, footballEndpoint, footballConference] = slug;

      // Validate conference param for all endpoints that use it
      if (
        footballEndpoint !== "playoff_rankings" &&
        footballEndpoint !== "debug" &&
        footballEndpoint !== "composite_ratings" &&
        !validatePathSegment(footballConference)
      ) {
        return NextResponse.json(
          { error: "Invalid path segment" },
          { status: 400 },
        );
      }

      switch (footballEndpoint) {
        case "standings":
          backendPath = `/football/standings/${footballConference}`;
          break;
        case "cwv":
          backendPath = `/football/cwv/${footballConference}`;
          break;
        case "conf_schedule":
          backendPath = `/football/conf_schedule/${footballConference}`;
          break;
        case "twv":
          backendPath = `/football/twv/${footballConference}`;
          break;
        case "conf-champ":
        case "conf_champ":
          backendPath = `/football/conf_champ/${footballConference}`;
          break;
        case "seed":
          backendPath = `/football_seed/${footballConference}`;
          break;
        case "cfp":
          backendPath = `/cfp/${footballConference}`;
          break;
        case "team":
          backendPath = `/football_team/${footballConference}`;
          break;
        case "playoff_rankings":
          backendPath = `/football/playoff_rankings`;
          break;
        case "composite_ratings":
          // Handle sub-routes: football/composite_ratings/dates,
          // football/composite_ratings/history
          if (footballConference === "dates" || footballConference === "history") {
            backendPath = `/football/composite_ratings/${footballConference}`;
          } else {
            return NextResponse.json(
              { error: "Unknown composite_ratings endpoint" },
              { status: 404 },
            );
          }
          break;
        case "debug":
          // Handle debug sub-routes: football/debug/probability_check
          if (slug.length === 3 && slug[2]) {
            if (!validatePathSegment(slug[2])) {
              return NextResponse.json(
                { error: "Invalid path segment" },
                { status: 400 },
              );
            }
            backendPath = `/football/debug/${slug[2]}`;
          } else {
            return NextResponse.json(
              { error: "Invalid debug endpoint" },
              { status: 404 },
            );
          }
          break;
        default:
          return NextResponse.json(
            { error: "Unknown football endpoint" },
            { status: 404 },
          );
      }
    }
    // Handle 2-part routes with history: football_conf_data/history
    else if (
      slug.length === 2 &&
      slug[0] === "football_conf_data" &&
      slug[1] === "history"
    ) {
      backendPath = `/football_conf_data/history`;
    } else if (
      slug.length === 2 &&
      slug[0] === "unified_conference_data" &&
      slug[1] === "history"
    ) {
      backendPath = `/unified_conference_data/history`;
    }
    // Handle 2-part routes
    else if (slug.length === 2) {
      const [first, second] = slug;

      // Handle basketball 2-part routes
      if (first === "basketball") {
        switch (second) {
          case "teams":
            backendPath = `/basketball_teams`;
            break;
          case "conf-data":
            backendPath = `/unified_conference_data`;
            break;
          case "ncaa-projections":
            backendPath = `/basketball/ncaa-projections`;
            break;
          case "upcoming_games":
            backendPath = `/basketball/upcoming_games`;
            break;
          case "composite_ratings":
            backendPath = `/basketball/composite_ratings`;
            break;
          case "season_highlights":
            backendPath = `/basketball/season_highlights`;
            break;
          default:
            return NextResponse.json(
              { error: "Unknown basketball endpoint" },
              { status: 404 },
            );
        }
      }
      // Handle football 2-part routes
      else if (first === "football") {
        switch (second) {
          case "teams":
            backendPath = `/football_teams`;
            break;
          case "conf-data":
            backendPath = `/football_conf_data`;
            break;
          case "future_games":
            backendPath = `/football/future_games`;
            break;
          case "all_future_games":
            backendPath = `/football/all_future_games`;
            break;
          case "season_highlights":
            backendPath = `/football/season_highlights`;
            break;
          case "bowl-picks":
            backendPath = `/football/bowl-picks`;
            break;
          case "bowl-scoreboard":
            backendPath = `/football/bowl-scoreboard`;
            break;
          case "composite_ratings":
            backendPath = `/football/composite_ratings`;
            break;
          default:
            return NextResponse.json(
              { error: "Unknown football endpoint" },
              { status: 404 },
            );
        }
      }
      // Handle other 2-part routes
      else {
        const [endpoint, conference] = slug;

        if (!validatePathSegment(conference)) {
          return NextResponse.json(
            { error: "Invalid path segment" },
            { status: 400 },
          );
        }

        switch (endpoint) {
          case "standings":
            backendPath = `/standings/${conference}`;
            break;
          case "cwv":
            backendPath = `/cwv/${conference}`;
            break;
          case "conf_schedule":
            backendPath = `/conf_schedule/${conference}`;
            break;
          case "twv":
            backendPath = `/twv/${conference}`;
            break;
          case "conf_tourney":
            backendPath = `/conf_tourney/${conference}`;
            break;
          case "seed":
            backendPath = `/seed/${conference}`;
            break;
          case "ncaa_tourney":
            backendPath = `/ncaa_tourney/${conference}`;
            break;
          case "team":
            backendPath = `/team/${conference}`;
            break;
          case "cfp":
            backendPath = `/cfp/${conference}`;
            break;
          case "football_seed":
            backendPath = `/football_seed/${conference}`;
            break;
          case "football_team":
            backendPath = `/football_team/${conference}`;
            break;
          default:
            return NextResponse.json(
              { error: "Unknown endpoint" },
              { status: 404 },
            );
        }
      }
    } else {
      return NextResponse.json(
        { error: "Invalid URL structure" },
        { status: 404 },
      );
    }

    // =========================================================================
    // SEASON ARCHIVE: Forward ?season= query parameter to the backend
    // =========================================================================
    const seasonQuery = getForwardedQueryString(_request);
    const backendUrl = `${BACKEND_BASE_URL}${backendPath}${seasonQuery}`;

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      cache: "no-store", // Force no caching
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      logger.warn("Backend request failed", { backendPath, status: response.status });
      return NextResponse.json(
        {
          error: `Backend request failed: ${response.status}`,
          details: response.statusText,
          url: backendPath,
        },
        { status: response.status },
      );
    }

    // Get raw text first to ensure we're not losing data
    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      logger.error("Backend returned invalid JSON", {
        backendPath,
        preview: responseText.slice(0, 200),
      });
      return NextResponse.json(
        { error: "Failed to parse backend response" },
        { status: 500 },
      );
    }

    // CDN caching per freshness class (src/lib/cache-policy.ts)
    const cacheClass = cacheClassForBackendPath(
      backendPath,
      _request.nextUrl.searchParams.get("season"),
    );
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": CACHE_POLICIES[cacheClass].cacheControl,
        "x-cache-class": cacheClass,
      },
    });
  } catch (error) {
    logger.error("Proxy GET failed", error);
    return NextResponse.json(
      {
        error: "Internal proxy error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST Handler for proxying POST requests to the backend
 *
 * Supported routes:
 * - POST /api/proxy/football/whatif
 *   Calculates what-if scenarios
 *
 * - POST /api/proxy/football/whatif/export
 *   Exports what-if scenarios as wide-format CSV
 *
 * - POST /api/proxy/football/whatif/structured-csv
 *   Exports what-if scenarios in structured CSV format
 *
 * - POST /api/proxy/football/bowl-game-winner
 *   Marks a bowl game with a winner
 *
 * - POST /api/proxy/basketball/chart/upload
 *   Uploads CSV for scatterplot chart
 *
 * - POST /api/proxy/basketball/whatif
 *   Calculates basketball what-if scenarios
 *
 * - POST /api/proxy/basketball/whatif/baseline
 *   Lightweight baseline load (no simulations)
 *
 * - POST /api/proxy/basketball/whatif/validation-csv
 *   Downloads validation CSV for what-if scenarios
 */
async function handlePost(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    // Production by default; set BACKEND_API_URL (src/config/env.ts) to point
    // at a local backend, e.g. http://localhost:5000/api.
    const BACKEND_BASE_URL = BACKEND_API_URL;

    let backendPath = "";
    let isFormData = false;

    // ===== HANDLE BASKETBALL CHART UPLOAD =====
    if (
      slug.length === 3 &&
      slug[0] === "basketball" &&
      slug[1] === "chart" &&
      slug[2] === "upload"
    ) {
      backendPath = `/basketball/chart/upload`;
      isFormData = true;
    }
    // ===== HANDLE BOWL PICKS ROUTES =====
    else if (
      slug.length === 2 &&
      slug[0] === "football" &&
      slug[1] === "bowl-game-winner"
    ) {
      backendPath = `/football/bowl-game-winner`;
    }
    // ===== HANDLE FOOTBALL WHAT-IF ROUTES =====
    else if (
      slug.length === 2 &&
      slug[0] === "football" &&
      slug[1] === "whatif"
    ) {
      backendPath = `/football/whatif`;
    } else if (
      slug.length === 3 &&
      slug[0] === "football" &&
      slug[1] === "whatif" &&
      slug[2] === "export"
    ) {
      backendPath = `/football/whatif/export`;
    } else if (
      slug.length === 3 &&
      slug[0] === "football" &&
      slug[1] === "whatif" &&
      slug[2] === "structured-csv"
    ) {
      backendPath = `/football/whatif/structured-csv`;
    } else if (
      slug.length === 3 &&
      slug[0] === "football" &&
      slug[1] === "whatif" &&
      slug[2] === "download"
    ) {
      backendPath = `/football/whatif/download`;
    } else if (
      slug.length === 3 &&
      slug[0] === "football" &&
      slug[1] === "whatif" &&
      slug[2] === "game-impacts"
    ) {
      backendPath = `/football/whatif/game-impacts`;
    }

    // ===== HANDLE BASKETBALL WHAT-IF BASELINE =====
    else if (
      slug.length === 3 &&
      slug[0] === "basketball" &&
      slug[1] === "whatif" &&
      slug[2] === "baseline"
    ) {
      backendPath = `/basketball/whatif/baseline`;
    }

    // ===== HANDLE BASKETBALL WHAT-IF NEXT-GAME-IMPACT =====
    else if (
      slug.length === 3 &&
      slug[0] === "basketball" &&
      slug[1] === "whatif" &&
      slug[2] === "next-game-impact"
    ) {
      backendPath = `/basketball/whatif/next-game-impact`;
    }

    // ===== HANDLE BASKETBALL WHAT-IF VALIDATION CSV =====
    else if (
      slug.length === 3 &&
      slug[0] === "basketball" &&
      slug[1] === "whatif" &&
      slug[2] === "validation-csv"
    ) {
      backendPath = `/basketball/whatif/validation-csv`;
    }

    // ===== HANDLE BASKETBALL WHAT-IF ROUTES =====
    else if (
      slug.length === 2 &&
      slug[0] === "basketball" &&
      slug[1] === "whatif"
    ) {
      backendPath = `/basketball/whatif`;
    }
    // ===== UNKNOWN ROUTE =====
    else {
      logger.warn("Unknown POST endpoint", { slug });
      return NextResponse.json(
        { error: "Unknown POST endpoint", slug: slug },
        { status: 404 },
      );
    }

    // =========================================================================
    // SEASON ARCHIVE: Forward ?season= query parameter to the backend for POSTs
    // =========================================================================
    const seasonQuery = getForwardedQueryString(request);
    const backendUrl = `${BACKEND_BASE_URL}${backendPath}${seasonQuery}`;

    let fetchOptions: RequestInit;

    if (isFormData) {
      const formData = await request.formData();

      fetchOptions = {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(300000),
      };
    } else {
      const body = await request.json();

      // Determine timeout based on endpoint
      let timeout = 120000; // 2 minutes default for whatif calculations
      if (
        backendPath.includes("export") ||
        backendPath.includes("validation-csv")
      ) {
        timeout = 300000; // 5 minutes for exports and CSV generation
      } else if (backendPath.includes("game-impacts")) {
        timeout = 240000; // 4 minutes: one call fans out to many single-game sims
      } else if (backendPath.includes("baseline")) {
        timeout = 60000; // 1 minute for baseline (should be fast)
      }

      fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      };
    }

    // Make request to backend
    const response = await fetch(backendUrl, fetchOptions);

    // ===== HANDLE CSV RESPONSE (validation-csv endpoint returns CSV, not JSON) =====
    if (backendPath.includes("validation-csv")) {
      if (!response.ok) {
        const errorText = await response.text();
        logger.warn("Backend request failed", {
          backendPath,
          status: response.status,
          preview: errorText.slice(0, 200),
        });
        return NextResponse.json(
          {
            error: `Backend request failed: ${response.status}`,
            details: errorText.substring(0, 200),
          },
          { status: response.status },
        );
      }
      const csvText = await response.text();
      return new NextResponse(csvText, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition":
            response.headers.get("Content-Disposition") ||
            'attachment; filename="validation.csv"',
        },
      });
    }

    // ===== HANDLE JSON RESPONSES (all other endpoints) =====
    const responseText = await response.text();

    if (!response.ok) {
      logger.warn("Backend request failed", {
        backendPath,
        status: response.status,
        preview: responseText.slice(0, 200),
      });

      return NextResponse.json(
        {
          error: `Backend request failed: ${response.status}`,
          details: responseText.substring(0, 200),
          url: backendPath,
        },
        { status: response.status },
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      logger.error("Backend returned invalid JSON", {
        backendPath,
        preview: responseText.slice(0, 200),
      });

      return NextResponse.json(
        { error: "Failed to parse backend response" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Proxy POST failed", error);

    return NextResponse.json(
      {
        error: "Failed to process POST request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}