import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime and disable static optimization
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  try {
    const { slug } = await params;

    const BACKEND_BASE_URL =
      "https://jthomprodbackend-production.up.railway.app/api";

    let backendPath = "";

    console.log("Proxy slug:", slug);

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
      backendPath = `/cfp/${teamName}/history`;
    }
    // Handle 4-part routes with history: football/standings/Big_12/history
    else if (
      slug.length === 4 &&
      slug[0] === "football" &&
      slug[3] === "history"
    ) {
      const [, footballEndpoint, footballConference] = slug;
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
      backendPath = `/cfp/${conference}/history`;
    }
    // Handle 3-part basketball history routes: standings/Big_12/history
    else if (
      slug.length === 3 &&
      slug[0] === "standings" &&
      slug[2] === "history"
    ) {
      const [, conference] = slug; // Get the conference from position 1
      const formattedConference = conference.replace(/\s+/g, "_");
      backendPath = `/standings/${formattedConference}/history`;
    } else if (
      slug.length === 3 &&
      slug[0] === "conf_tourney" &&
      slug[2] === "history"
    ) {
      const [, conference] = slug;
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
      backendPath = `/basketball/nonconf_analysis/${conference}`;
    }
    // Handle 3-part basketball conference championship analysis routes: basketball/conf_champ_analysis/ACC
    else if (
      slug.length === 3 &&
      slug[0] === "basketball" &&
      slug[1] === "conf_champ_analysis"
    ) {
      const [, , conference] = slug;
      backendPath = `/basketball/conf_champ_analysis/${conference}`;
    }
    // Handle 3-part football routes: football/standings/Big_12
    else if (slug.length === 3 && slug[0] === "football") {
      const [, footballEndpoint, footballConference] = slug;

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
        case "debug":
          // Handle debug sub-routes: football/debug/probability_check
          if (slug.length === 3 && slug[2]) {
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
          case "bowl-picks":
            backendPath = `/football/bowl-picks`;
            break;
          case "bowl-scoreboard":
            backendPath = `/football/bowl-scoreboard`;
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

    // Make request to Railway backend with improved caching and error handling
    const backendUrl = `${BACKEND_BASE_URL}${backendPath}`;
    console.log("Backend URL:", backendUrl);

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
      console.error(
        `Backend request failed: ${response.status} ${response.statusText} for ${backendUrl}`,
      );
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
    console.log("🔗 PROXY: Response size:", responseText.length, "bytes");

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("🔗 PROXY: JSON parse error:", parseError);
      console.error(
        "🔗 PROXY: Raw response preview:",
        responseText.substring(0, 500),
      );
      return NextResponse.json(
        { error: "Failed to parse backend response" },
        { status: 500 },
      );
    }

    // Enhanced debug logging for football_conf_data
    if (backendPath.includes("football_conf_data")) {
      console.log("🔗 PROXY: Successfully parsed JSON");
      console.log("🔗 PROXY: Data structure:", {
        hasData: !!data.data,
        isArray: Array.isArray(data.data),
        length: data.data?.length,
        firstItemKeys: data.data?.[0]
          ? Object.keys(data.data[0])
          : "no first item",
      });

      if (data.data?.[0]) {
        const firstItem = data.data[0];
        console.log("🔗 PROXY: Sagarin fields check:", {
          sagarin_min:
            "sagarin_min" in firstItem ? firstItem.sagarin_min : "MISSING",
          sagarin_max:
            "sagarin_max" in firstItem ? firstItem.sagarin_max : "MISSING",
          sagarin_median:
            "sagarin_median" in firstItem
              ? firstItem.sagarin_median
              : "MISSING",
          sagarin_q25:
            "sagarin_q25" in firstItem ? firstItem.sagarin_q25 : "MISSING",
          sagarin_q75:
            "sagarin_q75" in firstItem ? firstItem.sagarin_q75 : "MISSING",
        });

        // Count total fields
        console.log(
          "🔗 PROXY: Total fields in first item:",
          Object.keys(firstItem).length,
        );
        console.log("🔗 PROXY: All fields:", Object.keys(firstItem));
      }
    }

    // Return with no-cache headers
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
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
 *   Exports what-if scenarios as CSV
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
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  try {
    const { slug } = await params;

    console.log("🔵 POST PROXY CALLED");
    console.log("🔵 Slug:", slug);
    console.log(
      "🔵 Request content-type:",
      request.headers.get("content-type"),
    );

    const BACKEND_BASE_URL =
      "https://jthomprodbackend-production.up.railway.app/api";

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
      console.log("🎨 BASKETBALL CHART UPLOAD detected");
    }
    // ===== HANDLE BOWL PICKS ROUTES =====
    else if (
      slug.length === 2 &&
      slug[0] === "football" &&
      slug[1] === "bowl-game-winner"
    ) {
      backendPath = `/football/bowl-game-winner`;
      console.log("🏈 FOOTBALL BOWL GAME WINNER detected");
    }
    // ===== HANDLE FOOTBALL WHAT-IF ROUTES =====
    else if (
      slug.length === 2 &&
      slug[0] === "football" &&
      slug[1] === "whatif"
    ) {
      backendPath = `/football/whatif`;
      console.log("🤔 FOOTBALL WHAT-IF detected");
    } else if (
      slug.length === 3 &&
      slug[0] === "football" &&
      slug[1] === "whatif" &&
      slug[2] === "export"
    ) {
      backendPath = `/football/whatif/export`;
      console.log("📥 FOOTBALL WHAT-IF EXPORT detected");
    }

    // ===== HANDLE BASKETBALL WHAT-IF BASELINE =====
    else if (
      slug.length === 3 &&
      slug[0] === "basketball" &&
      slug[1] === "whatif" &&
      slug[2] === "baseline"
    ) {
      backendPath = `/basketball/whatif/baseline`;
      console.log("🏀 BASKETBALL WHAT-IF BASELINE detected");
    }

    // ===== HANDLE BASKETBALL WHAT-IF NEXT-GAME-IMPACT =====
    else if (
      slug.length === 3 &&
      slug[0] === "basketball" &&
      slug[1] === "whatif" &&
      slug[2] === "next-game-impact"
    ) {
      backendPath = `/basketball/whatif/next-game-impact`;
      console.log("🏀 BASKETBALL WHAT-IF NEXT-GAME-IMPACT detected");
    }

    // ===== HANDLE BASKETBALL WHAT-IF VALIDATION CSV =====
    else if (
      slug.length === 3 &&
      slug[0] === "basketball" &&
      slug[1] === "whatif" &&
      slug[2] === "validation-csv"
    ) {
      backendPath = `/basketball/whatif/validation-csv`;
      console.log("🏀 BASKETBALL WHAT-IF VALIDATION CSV detected");
    }

    // ===== HANDLE BASKETBALL WHAT-IF ROUTES =====
    else if (
      slug.length === 2 &&
      slug[0] === "basketball" &&
      slug[1] === "whatif"
    ) {
      backendPath = `/basketball/whatif`;
      console.log("🏀 BASKETBALL WHAT-IF detected");
    }
    // ===== UNKNOWN ROUTE =====
    else {
      console.error("❌ UNKNOWN POST ENDPOINT:", slug);
      return NextResponse.json(
        { error: "Unknown POST endpoint", slug: slug },
        { status: 404 },
      );
    }

    const backendUrl = `${BACKEND_BASE_URL}${backendPath}`;
    console.log("🌐 Backend URL:", backendUrl);

    let fetchOptions: RequestInit;

    if (isFormData) {
      console.log("📦 Processing as FormData");
      const formData = await request.formData();
      console.log(
        "📦 FormData entries:",
        Array.from(formData.entries()).map(([k]) => k),
      );
      console.log("📦 FormData file:", formData.get("file"));

      fetchOptions = {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(300000),
      };

      console.log("📦 FormData fetch options prepared");
    } else {
      console.log("📋 Processing as JSON");
      const body = await request.json();
      console.log("📋 JSON body keys:", Object.keys(body));

      // Determine timeout based on endpoint
      let timeout = 120000; // 2 minutes default for whatif calculations
      if (
        backendPath.includes("export") ||
        backendPath.includes("validation-csv")
      ) {
        timeout = 300000; // 5 minutes for exports and CSV generation
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

    console.log("🚀 Making backend request...");

    // Make request to backend
    const response = await fetch(backendUrl, fetchOptions);

    console.log("📡 Backend response received:", {
      status: response.status,
      statusText: response.statusText,
      headers: {
        contentType: response.headers.get("content-type"),
      },
    });

    // ===== HANDLE CSV RESPONSE (validation-csv endpoint returns CSV, not JSON) =====
    if (backendPath.includes("validation-csv")) {
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "❌ Validation CSV backend error:",
          errorText.substring(0, 500),
        );
        return NextResponse.json(
          {
            error: `Backend request failed: ${response.status}`,
            details: errorText.substring(0, 200),
          },
          { status: response.status },
        );
      }
      const csvText = await response.text();
      console.log("📄 Returning CSV response:", csvText.length, "bytes");
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
    console.log("📄 Backend raw response:", responseText.substring(0, 500));

    if (!response.ok) {
      console.error("❌ Backend returned error:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500),
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
      console.log("✅ Successfully parsed JSON response:", {
        success: data.success,
        dataLength: data.data?.length,
      });
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      console.error("❌ Raw response:", responseText.substring(0, 500));

      return NextResponse.json(
        { error: "Failed to parse backend response" },
        { status: 500 },
      );
    }

    // Log response based on endpoint type
    if (backendPath.includes("chart")) {
      console.log("🎨 PROXY POST: Chart upload completed:", {
        success: data.success,
        dataCount: data.data?.length || 0,
      });
    } else if (backendPath.includes("export")) {
      console.log("🔍 PROXY POST: CSV export completed:", {
        success: data.success,
        csv_size: data.csv_data?.length || 0,
        filename: data.filename,
      });
    } else if (backendPath.includes("bowl")) {
      console.log("🏈 PROXY POST: Bowl game marked:", {
        success: data.success,
        message: data.message,
      });
    } else {
      console.log("🔍 PROXY POST: What-If calculation completed:", {
        teams: data.data?.length || 0,
        calculation_time: data.metadata?.calculation_time || 0,
      });
    }

    console.log("✅ Returning successful response to client");

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("❌ POST PROXY ERROR:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "No stack",
    });

    return NextResponse.json(
      {
        error: "Failed to process POST request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
