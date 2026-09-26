/**
 * @jest-environment node
 */
// Contract between src/api/endpoints.ts and the proxy (plan step 4):
// every registered endpoint is accepted on each of its paths and forwarded to
// its backend path, and anything unregistered (path, method, query parameter
// or parameter value) is rejected without a backend request.

jest.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { ENDPOINTS, type Endpoint, type ParamRule, type QueryParam } from "@/api/endpoints";
import { GET, POST } from "../route";
import { REQUEST_SCHEMAS } from "@/api/schemas";

// A valid body for each JSON POST endpoint (what the site sends).
const selections = [{ game_id: 101, winner_team_id: 7 }];
const BODIES: Record<string, unknown> = {
  "basketball.whatIf": { conference: "Big_12", selections, lite: true },
  "basketball.whatIfBaseline": { conference: "Big 12" },
  "basketball.nextGameImpact": { conference: "Big 12", team_id: 7 },
  "basketball.whatIfValidationCsv": { conference: "Big 12", selections },
  "football.whatIf": { conference: "SEC", selections: [{ game_id: 5, winner_team_id: "12" }] },
  "football.whatIfExport": {
    conference: "SEC",
    selections,
    export_options: { include_all_scenarios: false, num_scenarios: 100, start_scenario: 1 },
  },
  "football.whatIfStructuredCsv": { conference: "SEC", selections },
  "football.whatIfDownload": { conference: "SEC", selections },
  "football.gameImpacts": { conference: "SEC", team_id: 12, days: 7 },
};
const bodyFor = (segments: string[]) =>
  ENDPOINTS.find((e) => e.method === "POST" && e.proxyPaths.includes(segments.join("/")))?.key;

const backendFetch = jest.fn();
global.fetch = backendFetch as unknown as typeof fetch;

const BACKEND = "https://jthomprodbackend-production.up.railway.app/api";

// A valid value for each rule, and what the backend receives for it.
const SAMPLE: Record<ParamRule, { value: string; backend: string }> = {
  segment: { value: "Big_12", backend: "Big_12" },
  conference: { value: "Big 12", backend: "Big_12" },
  team: { value: "Texas A&M", backend: "Texas%20A%26M" },
};
const QUERY_SAMPLE: Record<QueryParam, string> = {
  season: "2024-25",
  mode: "current",
  date: "2025-11-01",
};
const ALL_QUERY = Object.keys(QUERY_SAMPLE) as QueryParam[];

// Path segments as Next hands them to the route: URL-decoded.
function segmentsFor(endpoint: Endpoint, pattern: string, override?: [string, string]) {
  return pattern.split("/").map((part) => {
    if (!part.startsWith(":")) return part;
    const name = part.slice(1);
    return override?.[0] === name ? override[1] : SAMPLE[endpoint.params[name]].value;
  });
}

function expectedBackendPath(endpoint: Endpoint) {
  return endpoint.backendPath.replace(
    /:(\w+)/g,
    (_, name: string) => SAMPLE[endpoint.params[name]].backend,
  );
}

function call(method: string, segments: string[], query = "") {
  const url = `http://localhost/api/proxy/${segments.map(encodeURIComponent).join("/")}/${query}`;
  const formData = new FormData();
  formData.set("file", new Blob(["a,b\n1,2"]), "chart.csv");
  const isUpload = ENDPOINTS.some(
    (e) => e.body === "formData" && e.proxyPaths.includes(segments.join("/")),
  );
  const request = new NextRequest(url, {
    method,
    ...(method === "POST" &&
      (isUpload
        ? { body: formData }
        : {
            body: JSON.stringify(BODIES[bodyFor(segments) ?? ""] ?? {}),
            headers: { "content-type": "application/json" },
          })),
  });
  const handler = method === "GET" ? GET : POST;
  return handler(request, { params: Promise.resolve({ slug: segments }) });
}

const cases = ENDPOINTS.flatMap((endpoint) =>
  endpoint.proxyPaths.map((pattern) => [endpoint.key, pattern, endpoint] as const),
);

beforeEach(() => {
  backendFetch.mockReset();
  backendFetch.mockImplementation(async () => new Response(JSON.stringify({ data: [] })));
  for (const level of ["info", "warn", "error"] as const) {
    jest.spyOn(console, level).mockImplementation(() => {});
  }
});

describe.each(cases)("%s via /%s", (_key, pattern, endpoint) => {
  const segments = segmentsFor(endpoint, pattern);

  it("is accepted and forwarded with its allowed query parameters", async () => {
    const query = endpoint.allowedQuery.map((name) => `${name}=${QUERY_SAMPLE[name]}`).join("&");
    const res = await call(endpoint.method, segments, query ? `?${query}` : "");

    expect(res.status).toBe(200);
    expect(res.headers.get("x-endpoint")).toBe(endpoint.key);
    expect(backendFetch).toHaveBeenCalledTimes(1);
    const [url, init] = backendFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BACKEND}${expectedBackendPath(endpoint)}${query ? `?${query}` : ""}`);
    expect(init.method ?? "GET").toBe(endpoint.method);
  });

  it("rejects the other method", async () => {
    const res = await call(endpoint.method === "GET" ? "POST" : "GET", segments);
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe(endpoint.method);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it.each([...ALL_QUERY.filter((name) => !endpoint.allowedQuery.includes(name)), "unknown"])(
    "rejects the query parameter %s",
    async (name) => {
      const value = (QUERY_SAMPLE as Record<string, string>)[name] ?? "1";
      const res = await call(endpoint.method, segments, `?${name}=${value}`);
      expect(res.status).toBe(400);
      expect(backendFetch).not.toHaveBeenCalled();
    },
  );

  // (An endpoint may allow no query parameters at all.)
  if (endpoint.allowedQuery.length > 0) it.each(endpoint.allowedQuery)("rejects a malformed %s", async (name) => {
    const res = await call(endpoint.method, segments, `?${name}=x%2F..`);
    expect(res.status).toBe(400);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("rejects the path with an extra segment", async () => {
    const res = await call(endpoint.method, [...segments, "extra"]);
    // Only a registered longer shape (e.g. `/history`) may accept it.
    if (res.status !== 200) expect(backendFetch).not.toHaveBeenCalled();
    else expect(res.headers.get("x-endpoint")).not.toBe(endpoint.key);
  });
});

const paramCases = cases.flatMap(([key, pattern, endpoint]) =>
  Object.keys(endpoint.params).map((name) => [key, pattern, name, endpoint] as const),
);

describe.each(paramCases)("%s via /%s", (_key, pattern, name, endpoint) => {
  it(`rejects an invalid :${name}`, async () => {
    for (const bad of ["..", ".", "a/b", "a?b", "a#b", "a\\b", "a%2Fb", "x".repeat(81)]) {
      const res = await call(endpoint.method, segmentsFor(endpoint, pattern, [name, bad]));
      expect({ bad, status: res.status }).toEqual({ bad, status: 400 });
    }
    expect(backendFetch).not.toHaveBeenCalled();
  });
});

describe("POST bodies", () => {
  const jsonPosts = ENDPOINTS.filter((e) => e.method === "POST" && e.body === "json");

  it("has a request schema and a sample body for every JSON POST", () => {
    for (const e of jsonPosts) {
      expect({ key: e.key, schema: e.key in REQUEST_SCHEMAS }).toEqual({ key: e.key, schema: true });
      expect({ key: e.key, body: e.key in BODIES }).toEqual({ key: e.key, body: true });
    }
  });

  it.each(jsonPosts.map((e) => [e.key, e] as const))(
    "%s rejects a malformed body without calling the backend",
    async (_key, endpoint) => {
      const request = new NextRequest(`http://localhost/api/proxy/${endpoint.proxyPaths[0]}/`, {
        method: "POST",
        body: JSON.stringify({ conference: "../x", selections: "all" }),
        headers: { "content-type": "application/json" },
      });
      const res = await POST(request, {
        params: Promise.resolve({ slug: endpoint.proxyPaths[0].split("/") }),
      });
      expect(res.status).toBe(400);
      expect(backendFetch).not.toHaveBeenCalled();
    },
  );

  it("forwards only the fields the schema knows", async () => {
    const request = new NextRequest("http://localhost/api/proxy/football/whatif/game-impacts/", {
      method: "POST",
      body: JSON.stringify({ conference: "SEC", team_id: 12, max_sims: 100000, force_live: true }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(request, {
      params: Promise.resolve({ slug: ["football", "whatif", "game-impacts"] }),
    });
    expect(res.status).toBe(200);
    const sent = JSON.parse((backendFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ conference: "SEC", team_id: 12 });
  });

  it("rejects an upload without a file or over the size limit", async () => {
    for (const formData of [new FormData(), (() => {
      const f = new FormData();
      f.set("file", new Blob(["x".repeat(2 * 1024 * 1024 + 1)]), "big.csv");
      return f;
    })()]) {
      const request = new NextRequest("http://localhost/api/proxy/basketball/chart/upload/", {
        method: "POST",
        body: formData,
      });
      const res = await POST(request, {
        params: Promise.resolve({ slug: ["basketball", "chart", "upload"] }),
      });
      expect(res.status).toBe(400);
    }
    expect(backendFetch).not.toHaveBeenCalled();
  });
});

describe("unregistered paths", () => {
  it.each([
    [[""]],
    [["nope"]],
    [["football"]],
    [["football", "nope"]],
    [["football", "standings"]],
    [["team_schedule"]],
    [["football", "debug", "probability_check"]],
    [["football", "team", "BYU", "history", "sagarin_rank"]],
    [["health"]],
    [["basketball", "whatif", "conferences"]],
    [["football", "bowl-game-winner"]],
  ])("rejects %j", async (segments) => {
    for (const method of ["GET", "POST"]) {
      const res = await call(method, segments);
      expect({ method, status: res.status }).toEqual({ method, status: 404 });
    }
    expect(backendFetch).not.toHaveBeenCalled();
  });
});
