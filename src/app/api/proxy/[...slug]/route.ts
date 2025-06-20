import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;

    return NextResponse.json({
      message: "Proxy API endpoint",
      path: slug,
      query: Object.fromEntries(searchParams.entries()),
    });
  } catch (error) {
    console.error("Proxy API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
