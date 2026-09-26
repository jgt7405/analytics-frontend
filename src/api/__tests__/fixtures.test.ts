/**
 * @jest-environment node
 */
// The curated backend fixtures (fixtures/backend) served by MSW: they match
// the response schemas, flow through the proxy and the server fetches, and
// pass the API client's own validators. Scenarios cover a normal conference,
// an empty one, rows with missing fields, preseason zeros and an archived
// season.

jest.mock("server-only", () => ({}));

import { getResponse } from "msw";
import { setupServer } from "msw/node";
import { NextRequest } from "next/server";
import {
  FIXTURES,
  SCENARIO_CONFERENCES,
  backendHandlers,
  fixtureFor,
  proxyHandlers,
  requestLog,
  type Scenario,
} from "../../../fixtures/backend";
import type { EndpointKey } from "../endpoints";
import { RESPONSE_SCHEMAS } from "../schemas";
import { BACKEND_API_URL } from "@/config/env";
import { GET } from "@/app/api/proxy/[...slug]/route";
import { getFootballStandingsServer, getFootballTeamServer } from "@/lib/server-api";

const SCENARIOS: Scenario[] = ["normal", "empty", "missingFields", "preseason", "archived"];
const keys = Object.keys(FIXTURES) as EndpointKey[];

const server = setupServer(...backendHandlers(BACKEND_API_URL));
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  requestLog.length = 0;
  for (const level of ["info", "warn", "error", "debug", "log"] as const) {
    jest.spyOn(console, level).mockImplementation(() => {});
  }
});
afterEach(() => jest.restoreAllMocks());

describe("fixtures", () => {
  it.each(keys.flatMap((key) => SCENARIOS.map((s) => [key, s] as const)))(
    "%s (%s) matches its response schema",
    (key, scenario) => {
      const schema = (RESPONSE_SCHEMAS as Record<string, { safeParse(v: unknown): { success: boolean } }>)[key];
      const body = fixtureFor(key, scenario);
      expect(body).toBeDefined();
      if (schema) expect(schema.safeParse(body).success).toBe(true);
    },
  );
});

describe("the proxy serving fixtures", () => {
  const get = (path: string) => {
    const url = new URL(`http://localhost/api/proxy/${path}`);
    const slug = url.pathname.replace(/^\/api\/proxy\/|\/$/g, "").split("/").map(decodeURIComponent);
    return GET(new NextRequest(url), { params: Promise.resolve({ slug }) });
  };

  it("returns a conference table without schema warnings", async () => {
    const res = await get("football/standings/Southeastern/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.map((t: { team_name: string }) => t.team_name)).toEqual(["Alabama", "Georgia", "Texas"]);
    expect(JSON.stringify((console.warn as jest.Mock).mock.calls)).not.toContain("schema");
  });

  it.each(Object.entries(SCENARIO_CONFERENCES))("serves the %s scenario", async (scenario, conference) => {
    const res = await get(`standings/${conference}/`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(fixtureFor("basketball.standings", scenario as Scenario));
  });

  it("forwards the archived season to the backend", async () => {
    const res = await get("football/standings/Southeastern/?season=2024-25");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-cache-class")).toBe("currentStandings");
    expect(requestLog).toContain("/api/football/standings/Southeastern?season=2024-25");
    expect((await res.json()).conferences).toEqual(["Southeastern (archive)"]);
  });

  it("passes the backend's 404 for an endpoint without a fixture", async () => {
    const res = await get("football/cwv/Southeastern/");
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("server fetches of fixtures", () => {
  it("returns the fixture as initialData", async () => {
    const standings = await getFootballStandingsServer("Southeastern");
    expect(standings?.data?.length).toBe(3);
    const team = await getFootballTeamServer("Alabama");
    expect(team?.team_info.conference).toBe("Southeastern");
  });

  it("returns undefined when the backend has no data", async () => {
    // A conference with no fixture scenario still resolves; an endpoint
    // without a fixture 404s, which server-api turns into undefined.
    const { getFootballCWVServer } = await import("@/lib/server-api");
    expect(await getFootballCWVServer("Southeastern")).toBeUndefined();
  });
});

describe("the API client against fixtures", () => {
  const handlers = proxyHandlers("http://localhost");
  let realFetch: typeof fetch;
  beforeAll(() => {
    realFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(new URL(String(input), "http://localhost"), init);
      return (await getResponse(handlers, request)) ?? new Response("{}", { status: 404 });
    }) as typeof fetch;
  });
  afterAll(() => {
    global.fetch = realFetch;
  });

  it.each(["normal", "empty", "missingFields", "preseason"] as const)(
    "accepts football standings (%s) through its validator",
    async (scenario) => {
      const { api } = await import("@/services/api");
      const conference =
        scenario === "normal" ? "Southeastern" : SCENARIO_CONFERENCES[scenario].replace(/_/g, " ");
      const result = await api.getFootballStandings(conference);
      expect(result).toEqual(fixtureFor("football.standings", scenario));
    },
  );
});
