import type { NcaaAllTeam, WhatIfTeamResult } from "@/hooks/useBasketballWhatIf";
import { firstPlaceProb, getDeltaColor, getStandingProb, ncaaAllTeamResult, top4Prob, top8Prob } from "../helpers";

const team = (probs: Record<number, number>): WhatIfTeamResult =>
  ({
    team_id: 1,
    team_name: "Arizona",
    conference: "Big 12",
    ...Object.fromEntries(Object.entries(probs).map(([n, p]) => [`standing_${n}_prob`, p])),
  }) as unknown as WhatIfTeamResult;

describe("what-if helpers", () => {
  it("colors a change toward blue (up) or yellow (down), transparent when tiny", () => {
    expect(getDeltaColor(0.01, 10)).toEqual({ backgroundColor: "transparent", color: "#000000" });
    expect(getDeltaColor(10, 10).backgroundColor).toBe("rgb(24, 98, 123)");
    expect(getDeltaColor(-10, 10).backgroundColor).toBe("rgb(255, 230, 113)");
  });

  it("sums standing probabilities for 1st, top 4 and top 8", () => {
    const t = team({ 1: 10, 2: 20, 3: 5, 4: 5, 5: 10, 8: 5, 9: 40 });
    expect(getStandingProb(t, 6)).toBe(0);
    expect(firstPlaceProb(t)).toBe(10);
    expect(top4Prob(t)).toBe(40);
    expect(top8Prob(t)).toBe(55);
  });

  it("maps an all-teams NCAA row, at-large = bid − auto (never negative)", () => {
    const row = {
      team_id: 247,
      team_name: "Arizona",
      conference: "Big 12",
      logo_url: "/images/team_logos/arizona.png",
      current_bid_pct: 90,
      current_auto_pct: 30,
      current_average_seed: 2,
      whatif_bid_pct: 20,
      whatif_auto_pct: 25,
      whatif_average_seed: 9,
    } as NcaaAllTeam;
    expect(ncaaAllTeamResult(row, "current")).toMatchObject({
      tournament_bid_pct: 90,
      ncaa_at_large_pct: 60,
      average_seed: 2,
    });
    expect(ncaaAllTeamResult(row, "whatif").ncaa_at_large_pct).toBe(0);
  });
});
