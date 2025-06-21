import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;

    // Route to the correct Railway backend API
    const BACKEND_BASE_URL =
      "https://analytics-backend-production.up.railway.app/api";
    let backendPath = "";

    // Handle single endpoint with no conference (unified_conference_data)
    if (slug.length === 1) {
      const [endpoint] = slug;

      switch (endpoint) {
        case "unified_conference_data":
          backendPath = `/unified_conference_data`;
          break;
        default:
          return NextResponse.json(
            { error: "Unknown single endpoint" },
            { status: 404 }
          );
      }
    }
    // Handle endpoint + conference pattern
    else if (slug.length === 2) {
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
        case "ncca_tourney": // ✅ Handle the typo in your logs
          backendPath = `/ncaa_tourney/${conference}`;
          break;
        case "seed":
        case "seed_data": // ✅ Handle both variations
          backendPath = `/seed/${conference}`;
          break;
        case "conf_schedule":
          backendPath = `/conf_schedule/${conference}`;
          break;
        default:
          return NextResponse.json(
            { error: "Unknown endpoint" },
            { status: 404 }
          );
      }
    }
    // Handle football routes: /api/proxy/football/standings/Big_12
    else if (slug.length === 3 && slug[0] === "football") {
      const [, footballEndpoint, footballConference] = slug;
      backendPath = `/football/${footballEndpoint}/${footballConference}`;
    } else {
      return NextResponse.json(
        { error: "Invalid URL structure" },
        { status: 404 }
      );
    }

    // Make request to Railway backend
    const response = await fetch(`${BACKEND_BASE_URL}${backendPath}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `Backend API error: ${response.status} ${response.statusText} for ${backendPath}`
      );
      return NextResponse.json(
        {
          error: "Backend API error",
          status: response.status,
          path: backendPath,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Add CORS headers
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return NextResponse.json(data, { headers });
  } catch (error) {
    console.error("Proxy API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
