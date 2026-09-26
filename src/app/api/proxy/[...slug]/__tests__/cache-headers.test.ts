/**
 * @jest-environment node
 */
// Cache-Control on proxy responses (src/lib/cache-policy.ts): per-class on
// success, never cached on errors or POSTs.

jest.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { GET, POST } from "../route";

const backendFetch = jest.fn();
global.fetch = backendFetch as unknown as typeof fetch;

function context(slug: string[]) {
  return { params: Promise.resolve({ slug }) };
}
function get(path: string) {
  return new NextRequest(`http://localhost/api/proxy/${path}`);
}

beforeEach(() => {
  backendFetch.mockReset();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("proxy cache headers", () => {
  it("caches current standings for minutes", async () => {
    backendFetch.mockResolvedValue(new Response(JSON.stringify({ data: [] })));
    const res = await GET(get("football/standings/SEC/"), context(["football", "standings", "SEC"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=600",
    );
  });

  it("caches an archived season as historical", async () => {
    backendFetch.mockResolvedValue(new Response(JSON.stringify({ data: [] })));
    const res = await GET(
      get("football/standings/SEC/?season=2025-26"),
      context(["football", "standings", "SEC"]),
    );
    expect(backendFetch.mock.calls[0][0]).toContain("?season=2025-26");
    expect(res.headers.get("Cache-Control")).toMatch(/s-maxage=3600/);
  });

  it("never caches a backend error", async () => {
    backendFetch.mockResolvedValue(new Response("boom", { status: 502 }));
    const res = await GET(get("football/standings/SEC/"), context(["football", "standings", "SEC"]));
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("never caches an unknown endpoint", async () => {
    const res = await GET(get("nope/"), context(["nope"]));
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("keeps POST results out of shared caches", async () => {
    backendFetch.mockResolvedValue(new Response(JSON.stringify({ data: [] })));
    const req = new NextRequest("http://localhost/api/proxy/football/whatif/", {
      method: "POST",
      body: JSON.stringify({ conference: "SEC" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, context(["football", "whatif"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
