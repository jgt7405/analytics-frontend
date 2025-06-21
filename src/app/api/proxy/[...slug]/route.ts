import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const [endpoint, conference] = slug;

    // Route to the correct internal API based on the endpoint
    let internalApiPath = "";

    switch (endpoint) {
      case "standings":
        internalApiPath = `/api/standings/${conference}`;
        break;
      case "cwv":
        internalApiPath = `/api/cwv/${conference}`;
        break;
      case "twv":
        internalApiPath = `/api/twv/${conference}`;
        break;
      case "conf-tourney":
        internalApiPath = `/api/conf_tourney/${conference}`;
        break;
      case "ncaa-tourney":
        internalApiPath = `/api/ncaa_tourney/${conference}`;
        break;
      case "seed":
        internalApiPath = `/api/seed/${conference}`;
        break;
      case "schedule":
        internalApiPath = `/api/conf_schedule/${conference}`;
        break;
      default:
        return NextResponse.json(
          { error: "Unknown endpoint" },
          { status: 404 }
        );
    }

    // Make internal request to your actual API routes
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}${internalApiPath}`);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Internal API error" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
