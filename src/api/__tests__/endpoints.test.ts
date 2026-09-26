// The endpoint list itself: well-formed entries and the matching rules. The
// proxy's behavior against the list is covered by the contract tests.

import {
  ENDPOINTS,
  buildBackendPath,
  checkQuery,
  isValidParam,
  matchEndpoint,
} from "../endpoints";

const paramNames = (path: string) =>
  path
    .split("/")
    .filter((part) => part.startsWith(":"))
    .map((part) => part.slice(1))
    .sort();


describe("ENDPOINTS", () => {
  it("has unique keys, prefixed with the sport", () => {
    const keys = ENDPOINTS.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const e of ENDPOINTS) expect(e.key.startsWith(`${e.sport}.`)).toBe(true);
  });

  it("declares a rule for every parameter in every path, and no others", () => {
    for (const e of ENDPOINTS) {
      const declared = Object.keys(e.params).sort();
      expect({ key: e.key, params: paramNames(e.backendPath) }).toEqual({ key: e.key, params: declared });
      for (const path of e.proxyPaths) {
        expect({ key: e.key, path, params: paramNames(path) }).toEqual({ key: e.key, path, params: declared });
      }
    }
  });

  it("writes paths without leading or trailing slashes (proxy) and with a leading one (backend)", () => {
    for (const e of ENDPOINTS) {
      expect(e.backendPath).toMatch(/^\/[^?]*[^/]$/);
      for (const path of e.proxyPaths) expect(path).toMatch(/^[^/?].*[^/]$/);
    }
  });

  it("registers each proxy path and method once", () => {
    const seen = new Set<string>();
    for (const e of ENDPOINTS) {
      for (const path of e.proxyPaths) {
        const id = `${e.method} ${path.replace(/:\w+/g, ":")}`;
        expect(seen.has(id) ? id : "").toBe("");
        seen.add(id);
      }
    }
  });

  it("gives POSTs a body and the scenario class, and GETs neither", () => {
    for (const e of ENDPOINTS) {
      if (e.method === "POST") {
        expect(e.body).toBeDefined();
        expect(e.cacheClass).toBe("scenario");
        expect(e.passthroughEligible).toBe(false);
      } else {
        expect(e.body).toBeUndefined();
        expect(e.cacheClass).not.toBe("scenario");
      }
    }
  });
});

describe("isValidParam", () => {
  it.each(["Big_12", "Big 12", "SEC", "All_Teams", "Pac-12", "St. Mary"])(
    "accepts conference %s",
    (value) => expect(isValidParam("conference", value)).toBe(true),
  );

  it.each(["Texas A&M", "St. John's", "Miami (OH)", "San José State", "Hawai'i"])(
    "accepts team %s",
    (value) => expect(isValidParam("team", value)).toBe(true),
  );

  it.each([
    ["segment", "Texas A&M"],
    ["segment", ".."],
    ["team", ".."],
    ["team", "."],
    ["team", "a/b"],
    ["team", "a\\b"],
    ["team", "a?b"],
    ["team", "a#b"],
    ["team", "a%2Fb"],
    ["team", "a\u0000b"],
    ["team", ""],
    ["conference", "x".repeat(81)],
  ] as const)("rejects %s %j", (rule, value) => {
    expect(isValidParam(rule, value)).toBe(false);
  });
});

describe("matchEndpoint", () => {
  it("matches a path with parameters", () => {
    const match = matchEndpoint("GET", ["football", "standings", "SEC"]);
    expect(match).toMatchObject({ kind: "ok", endpoint: { key: "football.standings" }, params: { conference: "SEC" } });
  });

  it("matches an alias to the same endpoint", () => {
    expect(matchEndpoint("GET", ["football", "cfp", "SEC"])).toMatchObject({ endpoint: { key: "football.cfp" } });
    expect(matchEndpoint("GET", ["teams"])).toMatchObject({ endpoint: { key: "basketball.teams" } });
  });

  it("prefers the history route over a same-length parameter route", () => {
    expect(matchEndpoint("GET", ["standings", "SEC", "history"])).toMatchObject({ endpoint: { key: "basketball.standingsHistory" } });
    expect(matchEndpoint("GET", ["standings", "json", "SEC"])).toMatchObject({ endpoint: { key: "basketball.standingsJson" } });
  });

  it("reports an invalid parameter", () => {
    expect(matchEndpoint("GET", ["team", ".."])).toMatchObject({ kind: "invalidParam", param: "team" });
  });

  it("reports the allowed methods for a registered path", () => {
    expect(matchEndpoint("GET", ["football", "whatif"])).toEqual({ kind: "methodNotAllowed", allowed: ["POST"] });
    expect(matchEndpoint("POST", ["football", "standings", "SEC"])).toEqual({ kind: "methodNotAllowed", allowed: ["GET"] });
  });

  it("does not match unregistered paths", () => {
    expect(matchEndpoint("GET", ["nope"])).toEqual({ kind: "notFound" });
    expect(matchEndpoint("GET", ["football", "standings"])).toEqual({ kind: "notFound" });
    expect(matchEndpoint("GET", ["football", "standings", "SEC", "extra"])).toEqual({ kind: "notFound" });
  });
});

describe("buildBackendPath", () => {
  const byKey = (key: string) => ENDPOINTS.find((e) => e.key === key)!;

  it("encodes team names", () => {
    expect(buildBackendPath(byKey("basketball.team"), { team: "Texas A&M" })).toBe("/team/Texas%20A%26M");
  });

  it("turns spaces into underscores for conference rules only", () => {
    expect(buildBackendPath(byKey("basketball.standingsHistory"), { conference: "Big 12" })).toBe("/standings/Big_12/history");
    expect(buildBackendPath(byKey("basketball.standings"), { conference: "Big 12" })).toBe("/standings/Big%2012");
  });

  it("drops the placeholder segment for playoff rankings", () => {
    expect(buildBackendPath(byKey("football.playoffRankings"), {})).toBe("/football/playoff_rankings");
  });
});

describe("checkQuery", () => {
  const standings = ENDPOINTS.find((e) => e.key === "football.standings")!;
  const rankings = ENDPOINTS.find((e) => e.key === "football.playoffRankings")!;
  const q = (s: string) => new URLSearchParams(s);

  it("forwards allowed parameters", () => {
    const result = checkQuery(rankings, q("season=2025-26&mode=current"));
    expect(result.ok && result.query.toString()).toBe("season=2025-26&mode=current");
  });

  it("drops empty values", () => {
    const result = checkQuery(standings, q("season="));
    expect(result.ok && result.query.toString()).toBe("");
  });

  it.each(["mode=current", "foo=1", "season=2025", "season=2025-26&season=2024-25", "season=../x"])(
    "rejects %s on standings",
    (query) => expect(checkQuery(standings, q(query))).toMatchObject({ ok: false }),
  );
});
