/**
 * @jest-environment node
 */
// How the proxy forwards requests, as declared in src/api/endpoints.ts.

jest.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { GET, POST } from "../route";

const backendFetch = jest.fn();
global.fetch = backendFetch as unknown as typeof fetch;

const BACKEND = "https://jthomprodbackend-production.up.railway.app/api";

// Next hands the route URL-decoded slug segments.
function call(method: "GET" | "POST", path: string, body?: unknown) {
  const url = new URL(`http://localhost/api/proxy/${path}`);
  const slug = url.pathname
    .replace(/^\/api\/proxy\/|\/$/g, "")
    .split("/")
    .map(decodeURIComponent);
  const request = new NextRequest(url, {
    method,
    ...(body !== undefined && {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  });
  return (method === "GET" ? GET : POST)(request, {
    params: Promise.resolve({ slug }),
  });
}

beforeEach(() => {
  backendFetch.mockReset();
  backendFetch.mockImplementation(
    async () => new Response(JSON.stringify({ data: [] })),
  );
  for (const level of ["info", "warn", "error"] as const) {
    jest.spyOn(console, level).mockImplementation(() => {});
  }
});

const backendUrl = () => backendFetch.mock.calls[0][0] as string;

describe("proxy forwarding", () => {
  it("forwards team names with & ' and parentheses, encoded", async () => {
    const res = await call("GET", `team/${encodeURIComponent("Texas A&M")}/`);
    expect(res.status).toBe(200);
    expect(backendUrl()).toBe(`${BACKEND}/team/Texas%20A%26M`);

    await call("GET", `football_team/${encodeURIComponent("Miami (OH)")}/`);
    expect(backendFetch.mock.calls[1][0]).toBe(`${BACKEND}/football_team/Miami%20(OH)`);
  });

  it("turns conference spaces into underscores where the backend expects them", async () => {
    await call("GET", "standings/Big%2012/history/");
    expect(backendUrl()).toBe(`${BACKEND}/standings/Big_12/history`);
  });

  it("maps aliases and placeholders to the backend path", async () => {
    await call("GET", "football/playoff_rankings/All_Teams/?mode=current");
    expect(backendUrl()).toBe(`${BACKEND}/football/playoff_rankings?mode=current`);
  });

  it("forwards the season and marks the response with its endpoint", async () => {
    const res = await call("GET", "football/standings/SEC/?season=2025-26");
    expect(backendUrl()).toBe(`${BACKEND}/football/standings/SEC?season=2025-26`);
    expect(res.headers.get("x-endpoint")).toBe("football.standings");
    expect(res.headers.get("x-cache-class")).toBe("historical");
  });

  it("applies the endpoint's timeout", async () => {
    const timeout = jest.spyOn(AbortSignal, "timeout");
    await call("POST", "football/whatif/game-impacts/", { conference: "SEC", team_id: 12 });
    expect(timeout).toHaveBeenCalledWith(240_000);
    timeout.mockRestore();
  });

  it("passes a CSV GET through with its filename and cache class", async () => {
    backendFetch.mockResolvedValue(
      new Response("team,opponent\nDuke,Virginia", {
        headers: { "Content-Disposition": 'attachment; filename="bball_team_schedule_2026-09-26.csv"' },
      }),
    );
    const res = await call("GET", "basketball/team_schedule/csv/");
    expect(backendUrl()).toBe(`${BACKEND}/basketball/team_schedule/csv`);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("bball_team_schedule_2026-09-26.csv");
    expect(res.headers.get("Cache-Control")).toMatch(/s-maxage=300/);
    expect(await res.text()).toBe("team,opponent\nDuke,Virginia");
  });

  it("passes a response that drifted from its schema through, and logs it", async () => {
    const warn = jest.spyOn(console, "warn");
    warn.mockClear();
    backendFetch.mockResolvedValue(new Response(JSON.stringify({ rows: [] })));
    const res = await call("GET", "football/standings/SEC/");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rows: [] });
    expect(JSON.stringify(warn.mock.calls)).toContain("doesn't match its schema");
  });

  it("doesn't log a response that matches its schema", async () => {
    const warn = jest.spyOn(console, "warn");
    warn.mockClear();
    backendFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: [{ team_name: "Alabama", wins: 12 }], conferences: ["Southeastern"] })),
    );
    await call("GET", "football/standings/Southeastern/");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("schema");
  });

  it("returns CSV for CSV endpoints", async () => {
    backendFetch.mockResolvedValue(new Response("a,b\n1,2"));
    const res = await call("POST", "basketball/whatif/validation-csv/", {
      conference: "Big 12",
      selections: [],
    });
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(await res.text()).toBe("a,b\n1,2");
  });
});

describe("proxy rejections (never reach the backend)", () => {
  it.each([
    ["GET", "nope/", 404],
    ["GET", "football/whatif/", 405],
    ["POST", "football/standings/SEC/", 405],
    ["GET", `team/${encodeURIComponent("a/b")}/`, 400],
    ["GET", "football/standings/SEC/?foo=1", 400],
    ["GET", "football/standings/SEC/?mode=current", 400],
    ["GET", "football/standings/SEC/?season=bad", 400],
  ] as const)("%s %s → %i", async (method, path, status) => {
    const res = await call(method, path, method === "POST" ? { conference: "SEC", selections: [] } : undefined);
    expect(res.status).toBe(status);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("rejects a dot-only segment", async () => {
    // Browsers and Next normalize a literal ".." away; this is the slug a
    // hand-built request could still produce.
    const res = await GET(new NextRequest("http://localhost/api/proxy/team/x/"), {
      params: Promise.resolve({ slug: ["team", ".."] }),
    });
    expect(res.status).toBe(400);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("rejects a POST whose body isn't JSON", async () => {
    const request = new NextRequest("http://localhost/api/proxy/football/whatif/", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(request, { params: Promise.resolve({ slug: ["football", "whatif"] }) });
    expect(res.status).toBe(400);
    expect(backendFetch).not.toHaveBeenCalled();
  });
});
