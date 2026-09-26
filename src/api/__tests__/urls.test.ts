// URL helpers built from the endpoint list (src/api/urls.ts).

import { ENDPOINTS, matchEndpoint, type EndpointKey, type ParamRule } from "../endpoints";
import { apiPath, apiUrl, backendRequest } from "../urls";

const SAMPLE: Record<ParamRule, string> = {
  segment: "Big_12",
  conference: "Big 12",
  team: "Texas A&M",
};
const paramsFor = (key: EndpointKey) => {
  const endpoint = ENDPOINTS.find((e) => e.key === key)!;
  return Object.fromEntries(
    Object.entries(endpoint.params).map(([name, rule]) => [name, SAMPLE[rule]]),
  );
};

describe("apiPath", () => {
  it.each(ENDPOINTS.map((e) => [e.key] as const))(
    "builds a path the proxy accepts for %s",
    (key) => {
      const path = apiPath(key, paramsFor(key));
      const segments = path.split("?")[0].split("/").map(decodeURIComponent);
      const endpoint = ENDPOINTS.find((e) => e.key === key)!;
      expect(matchEndpoint(endpoint.method, segments)).toMatchObject({
        kind: "ok",
        endpoint: { key },
      });
    },
  );

  it("encodes parameters and adds the allowed query", () => {
    expect(apiPath("basketball.team", { team: "Texas A&M" }, { season: "2025-26" })).toBe(
      "team/Texas%20A%26M?season=2025-26",
    );
  });

  it("leaves out empty query values", () => {
    expect(
      apiPath("football.playoffRankings", {}, { season: undefined, mode: null }),
    ).toBe("football/playoff_rankings/All_Teams");
  });

  it.each([
    ["a missing parameter", () => apiPath("football.standings")],
    ["an unknown parameter", () => apiPath("football.teams", { conference: "SEC" })],
    ["an invalid parameter", () => apiPath("basketball.team", { team: "a/b" })],
    ["a query parameter the endpoint doesn't take", () => apiPath("football.standings", { conference: "SEC" }, { mode: "current" })],
    ["a malformed season", () => apiPath("football.teams", {}, { season: "2025" })],
  ])("throws on %s", (_, build) => {
    expect(build).toThrow();
  });
});

describe("apiUrl", () => {
  it("is the proxy URL with the trailing slash before the query", () => {
    expect(apiUrl("football.standings", { conference: "SEC" }, { season: "2025-26" })).toBe(
      "/api/proxy/football/standings/SEC/?season=2025-26",
    );
  });
});

describe("backendRequest", () => {
  it("builds the backend path, as the proxy forwards it", () => {
    expect(
      backendRequest("football.seed", { conference: "SEC" }, { season: "2025-26" }).path,
    ).toBe("/football_seed/SEC?season=2025-26");
    expect(backendRequest("basketball.standingsHistory", { conference: "Big 12" }).path).toBe(
      "/standings/Big_12/history",
    );
    expect(backendRequest("football.playoffRankings", {}, { mode: "current" }).path).toBe(
      "/football/playoff_rankings?mode=current",
    );
  });

  it("refuses an invalid team name from a page URL", () => {
    expect(() => backendRequest("basketball.team", { team: ".." })).toThrow();
  });
});
