import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const BACKEND_BASE_URL =
      "https://jthomprodbackend-production.up.railway.app/api";

    // Fetch sitemap from your backend
    const response = await fetch(`${BACKEND_BASE_URL}/sitemap.xml`, {
      method: "GET",
      headers: {
        Accept: "application/xml",
      },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const sitemapXml = await response.text();

    return new NextResponse(sitemapXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Sitemap error:", error);

    // Return basic fallback sitemap if backend fails
    const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://jthomanalytics.com/</loc>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://jthomanalytics.com/basketball/standings</loc>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>https://jthomanalytics.com/football/standings</loc>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
</urlset>`;

    return new NextResponse(basicSitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }
}
