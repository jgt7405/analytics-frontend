import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime and disable static optimization
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
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
            { status: 404 }
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
            { status: 404 }
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
            { status: 404 }
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
            { status: 404 }
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
              { status: 404 }
            );
          }
          break;
        default:
          return NextResponse.json(
            { error: "Unknown football endpoint" },
            { status: 404 }
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
          default:
            return NextResponse.json(
              { error: "Unknown basketball endpoint" },
              { status: 404 }
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
          case "future_games": // ðŸ‘ˆ ADD THIS
            backendPath = `/football/future_games`; // ðŸ‘ˆ ADD THIS
            break; // ðŸ‘ˆ ADD THIS
          default:
            return NextResponse.json(
              { error: "Unknown football endpoint" },
              { status: 404 }
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
              { status: 404 }
            );
        }
      }
    } else {
      return NextResponse.json(
        { error: "Invalid URL structure" },
        { status: 404 }
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
        `Backend request failed: ${response.status} ${response.statusText} for ${backendUrl}`
      );
      return NextResponse.json(
        {
          error: `Backend request failed: ${response.status}`,
          details: response.statusText,
          url: backendPath,
        },
        { status: response.status }
      );
    }

    // Get raw text first to ensure we're not losing data
    const responseText = await response.text();
    console.log("ðŸ” PROXY: Response size:", responseText.length, "bytes");

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("ðŸ” PROXY: JSON parse error:", parseError);
      console.error(
        "ðŸ” PROXY: Raw response preview:",
        responseText.substring(0, 500)
      );
      return NextResponse.json(
        { error: "Failed to parse backend response" },
        { status: 500 }
      );
    }

    // Enhanced debug logging for football_conf_data
    if (backendPath.includes("football_conf_data")) {
      console.log("ðŸ” PROXY: Successfully parsed JSON");
      console.log("ðŸ” PROXY: Data structure:", {
        hasData: !!data.data,
        isArray: Array.isArray(data.data),
        length: data.data?.length,
        firstItemKeys: data.data?.[0]
          ? Object.keys(data.data[0])
          : "no first item",
      });

      if (data.data?.[0]) {
        const firstItem = data.data[0];
        console.log("ðŸ” PROXY: Sagarin fields check:", {
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
          "ðŸ” PROXY: Total fields in first item:",
          Object.keys(firstItem).length
        );
        console.log("ðŸ” PROXY: All fields:", Object.keys(firstItem));
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
      { status: 500 }
    );
  }
}

// ðŸ‘‡ ADD THE POST HANDLER HERE ðŸ‘‡

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const BACKEND_BASE_URL =
      "https://jthomprodbackend-production.up.railway.app/api";

    let backendPath = "";

    console.log("Proxy POST slug:", slug);

    // Handle football what-if route
    if (slug.length === 2 && slug[0] === "football" && slug[1] === "whatif") {
      backendPath = `/football/whatif`;
    } else {
      return NextResponse.json(
        { error: "Unknown POST endpoint" },
        { status: 404 }
      );
    }

    const backendUrl = `${BACKEND_BASE_URL}${backendPath}`;
    console.log("Backend POST URL:", backendUrl);

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000), // 60 second timeout for calculations
    });

    if (!response.ok) {
      console.error(
        `Backend POST request failed: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        {
          error: `Backend request failed: ${response.status}`,
          details: response.statusText,
          url: backendPath,
        },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    console.log(
      "ðŸ“¦ PROXY POST: Response size:",
      responseText.length,
      "bytes"
    );

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("ðŸ“¦ PROXY POST: JSON parse error:", parseError);
      console.error(
        "ðŸ“¦ PROXY POST: Raw response preview:",
        responseText.substring(0, 500)
      );
      return NextResponse.json(
        { error: "Failed to parse backend response" },
        { status: 500 }
      );
    }

    console.log("ðŸ“¦ PROXY POST: What-If calculation completed:", {
      teams: data.data?.length || 0,
      calculation_time: data.metadata?.calculation_time || 0,
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("POST proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to process POST request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
