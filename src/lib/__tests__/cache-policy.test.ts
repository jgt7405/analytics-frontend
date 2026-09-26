import {
  CACHE_POLICIES,
  cacheClassFor,
  queryCachePolicy,
} from "../cache-policy";
import { endpointFor } from "@/api/urls";
import type { EndpointKey } from "@/api/endpoints";

const classFor = (key: EndpointKey, season?: string) =>
  cacheClassFor(endpointFor(key), season);

describe("cacheClassFor", () => {
  it.each([
    ["football.standings", undefined, "currentStandings"],
    ["basketball.standings", undefined, "currentStandings"],
    ["football.standingsHistory", undefined, "historical"],
    ["football.teamConfWinsHistory", undefined, "historical"],
    ["basketball.conferenceDataHistory", undefined, "historical"],
    ["football.allFutureGames", undefined, "live"],
    ["basketball.upcomingGames", undefined, "live"],
    ["football.bowlScoreboard", undefined, "live"],
    ["football.teams", undefined, "referenceData"],
    ["basketball.teams", undefined, "referenceData"],
  ] as const)("%s (season %s) is %s", (key, season, expected) => {
    expect(classFor(key, season)).toBe(expected);
  });

  it("caches archived football seasons as historical", () => {
    expect(classFor("football.standings", "2025-26")).toBe("historical");
    expect(classFor("football.cfp", "2025-26")).toBe("historical");
  });

  it("keeps the season basketball still serves as current at its own class", () => {
    // Current basketball pages pass ?season=2025-26 (next.config.js rewrite).
    expect(classFor("basketball.standings", "2025-26")).toBe("currentStandings");
  });

  it("never shortens reference data for an archived season", () => {
    expect(classFor("football.teams", "2025-26")).toBe("referenceData");
  });

  it("never caches scenarios, whatever the season", () => {
    expect(cacheClassFor({ sport: "football", cacheClass: "scenario" }, "2025-26")).toBe("scenario");
  });
});

describe("cache policies", () => {
  it("never puts scenarios in a shared cache", () => {
    expect(CACHE_POLICIES.scenario.cacheControl).toMatch(/private/);
    expect(CACHE_POLICIES.scenario.cacheControl).toMatch(/no-store/);
    expect(CACHE_POLICIES.scenario.revalidate).toBe(0);
  });

  it("keeps each layer's lifetime consistent within a class", () => {
    for (const [name, policy] of Object.entries(CACHE_POLICIES)) {
      if (name === "scenario") continue;
      const sMaxAge = Number(/s-maxage=(\d+)/.exec(policy.cacheControl)?.[1]);
      expect({ name, sMaxAge }).toEqual({ name, sMaxAge: policy.revalidate });
      expect({ name, staleMs: policy.staleTime }).toEqual({
        name,
        staleMs: policy.revalidate * 1000,
      });
      expect(policy.gcTime).toBeGreaterThanOrEqual(policy.staleTime);
    }
  });

  it("gives React Query only staleTime and gcTime", () => {
    expect(queryCachePolicy("historical")).toEqual({
      staleTime: CACHE_POLICIES.historical.staleTime,
      gcTime: CACHE_POLICIES.historical.gcTime,
    });
  });
});
