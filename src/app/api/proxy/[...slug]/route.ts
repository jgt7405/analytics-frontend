// src/app/api/proxy/[...slug]/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "https://analytics-backend-production.up.railway.app/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = params;
    const apiPath = slug.join("/");

    // Forward query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = `${API_BASE_URL}/${apiPath}${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(fullUrl, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": "public, max-age=300", // 5 minutes cache
      },
    });
  } catch (error) {
    console.error("Proxy API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from backend" },
      { status: 500 }
    );
  }
}
