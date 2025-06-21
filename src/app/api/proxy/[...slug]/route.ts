import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const [endpoint, conference] = slug;

    // Route to the correct Railway backend API
    const BACKEND_BASE_URL =
      "https://analytics-backend-production.up.railway.app/api";
    let backendPath = "";

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
        backendPath = `/conf_tourney/${conference}`;
        break;
      case "ncaa-tourney":
        backendPath = `/ncaa_tourney/${conference}`;
        break;
      case "seed":
        backendPath = `/seed/${conference}`;
        break;
      case "schedule":
        backendPath = `/conf_schedule/${conference}`;
        break;
      // Add football routes
      case "football":
        const [, footballEndpoint, footballConference] = slug;
        backendPath = `/football/${footballEndpoint}/${footballConference}`;
        break;
      default:
        return NextResponse.json(
          { error: "Unknown endpoint" },
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
        `Backend API error: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        { error: "Backend API error", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Add CORS headers for development
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
