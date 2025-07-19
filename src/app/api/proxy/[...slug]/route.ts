import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;

    const BACKEND_BASE_URL =
      "https://jthomprodbackend-production.up.railway.app/api";
    let backendPath = "";

    console.log("Proxy slug:", slug); // Debug log

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
        case "teams": // Support both variants
          backendPath = `/basketball_teams`;
          break;
        default:
          return NextResponse.json(
            { error: "Unknown single endpoint" },
            { status: 404 }
          );
      }
    }
    // Handle 3-part football routes FIRST: /api/proxy/football/standings/Big_12
    else if (slug.length === 3 && slug[0] === "football") {
      const [, footballEndpoint, footballConference] = slug;

      switch (footballEndpoint) {
        case "standings":
          backendPath = `/football/standings/${footballConference}`;
          break;
        case "cwv":
          backendPath = `/football/cwv/${footballConference}`;
          break;
        case "conf_schedule": // Added this mapping
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
        default:
          return NextResponse.json(
            { error: "Unknown football endpoint" },
            { status: 404 }
          );
      }
    }
    // Handle 2-part routes
    else if (slug.length === 2) {
      const [first, second] = slug;

      // Handle basketball 2-part routes: /api/proxy/basketball/teams
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
      // Handle football 2-part routes: /api/proxy/football/conf-data
      else if (first === "football") {
        switch (second) {
          case "conf-data":
            backendPath = `/football_conf_data`;
            break;
          case "teams":
            backendPath = `/football_teams`;
            break;
          default:
            return NextResponse.json(
              { error: "Unknown football endpoint" },
              { status: 404 }
            );
        }
      }
      // Handle basketball endpoint + conference pattern
      else {
        const [endpoint, conference] = slug;

        switch (endpoint) {
          case "standings":
            backendPath = `/standings/${conference}`;
            break;
          case "cwv":
            backendPath = `/cwv/${conference}`;
            break;
          case "twv":
            backendPath = `/twv/${conference}`;
            break;
          case "conf-tourney":
          case "conf_tourney":
            backendPath = `/conf_tourney/${conference}`;
            break;
          case "ncaa-tourney":
          case "ncaa_tourney":
          case "ncca_tourney":
            backendPath = `/ncaa_tourney/${conference}`;
            break;
          case "seed":
          case "seed_data":
            backendPath = `/seed/${conference}`;
            break;
          case "conf_schedule":
            backendPath = `/conf_schedule/${conference}`;
            break;
          case "team":
            backendPath = `/team/${conference}`;
            break;
          // Football endpoints with conference
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

    // Make request to Railway backend
    const backendUrl = `${BACKEND_BASE_URL}${backendPath}`;
    console.log("Backend URL:", backendUrl); // Debug log

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Add timeout
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

    const data = await response.json();
    return NextResponse.json(data);
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
