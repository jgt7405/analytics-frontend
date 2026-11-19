import {
  computeColorRanges,
  computePowerRanges,
  conferenceTwv,
  expectedWinPct,
  parseRecord,
  powerConferences,
  powerConferenceSections,
  powerTeamSections,
  sortConferences,
  sortPowerConferences,
  sortTeams,
  twvColor,
  winPctColor,
} from "../data";
import type { Conference, Team } from "../types";

const team = (name: string, twv: number, winPct: number): Team => ({
  team_name: name,
  power_record: "2-2",
  power_win_pct: winPct,
  power_twv_50: twv,
  nonpower_record: "5-1",
  nonpower_win_pct: 83.3,
  nonpower_twv_50: 0,
  total_record: "7-3",
  total_win_pct: 70,
  total_twv_50: twv,
});

const conf = (name: string, teams: Team[], totalTwv: number): Conference => ({
  team_conf: name,
  conf_logo_url: "",
  conf_primary_color: "#000",
  conf_secondary_color: "#fff",
  teams,
  power_record: "4-4",
  power_win_pct: 50,
  power_twv_50: totalTwv,
  nonpower_record: "10-2",
  nonpower_win_pct: 83.3,
  nonpower_twv_50: 0,
  total_record: "14-6",
  total_win_pct: 70,
  total_twv_50: totalTwv,
});

describe("computeColorRanges", () => {
  it("defaults to TWV -1..1 and win % 0..100 with no data", () => {
    const ranges = computeColorRanges([]);
    expect(ranges.conf.power.twv).toEqual({ min: -1, max: 1 });
    expect(ranges.team.total.winPct).toEqual({ min: 0, max: 100 });
  });

  it("uses per-team TWV for conferences and raw values for teams", () => {
    const data = [conf("A", [team("a1", 1, 40), team("a2", -0.5, 60)], 2), conf("B", [team("b1", 0.2, 50)], -1)];
    const ranges = computeColorRanges(data);
    expect(conferenceTwv(data[0], "power")).toBe(1);
    expect(ranges.conf.power.twv).toEqual({ min: -1, max: 1 });
    expect(ranges.team.power.twv).toEqual({ min: -0.5, max: 1 });
    expect(ranges.team.power.winPct).toEqual({ min: 40, max: 60 });
  });
});

describe("cell colors", () => {
  it("scales TWV from white toward blue or yellow", () => {
    expect(twvColor(0, -1, 1)).toEqual({ backgroundColor: "rgb(255, 255, 255)", color: "#000000" });
    expect(twvColor(1, -1, 1)).toEqual({ backgroundColor: "rgb(24, 98, 123)", color: "#ffffff" });
    expect(twvColor(-1, -1, 1)).toEqual({ backgroundColor: "rgb(255, 230, 113)", color: "#000000" });
  });

  it("scales win % yellow → white → blue across the column's range", () => {
    expect(winPctColor(0, 0, 100).backgroundColor).toBe("rgb(255, 230, 113)");
    expect(winPctColor(50, 0, 100).backgroundColor).toBe("rgb(255, 255, 255)");
    expect(winPctColor(100, 0, 100).backgroundColor).toBe("rgb(24, 98, 123)");
  });
});

describe("expectedWinPct and parseRecord", () => {
  it("backs TWV out of the record", () => {
    expect(expectedWinPct("7-3", 1)).toBeCloseTo(60);
    expect(expectedWinPct("0-0", 1)).toBe(0);
    expect(parseRecord("12-4")).toBe(12);
  });
});

describe("sorting", () => {
  const data = [conf("A", [team("a1", 1, 40)], 3), conf("B", [team("b1", 0, 50), team("b2", 2, 60)], 8)];

  it("sorts conferences by per-team TWV", () => {
    expect(sortConferences(data, "total_twv_50", "desc").map((c) => c.team_conf)).toEqual(["B", "A"]);
    expect(sortConferences(data, "total_twv_50", "asc").map((c) => c.team_conf)).toEqual(["A", "B"]);
  });

  it("sorts teams by value, or by name", () => {
    expect(sortTeams(data[1].teams, "total_twv_50", "desc").map((t) => t.team_name)).toEqual(["b2", "b1"]);
    expect(sortTeams(data[1].teams, "team_name", "asc").map((t) => t.team_name)).toEqual(["b1", "b2"]);
  });
});

describe("performance vs power conferences", () => {
  const drake = { ...team("Drake", 0.5, 50), vs_power: [{ opp_conf: "Big Ten", record: "1-0", win_pct: 100, twv_50: 0.6 }] };
  const bradley = { ...team("Bradley", -0.2, 0), vs_power: [] };
  const mvc: Conference = {
    ...conf("Missouri Valley", [drake, bradley], 0.4),
    vs_power: [
      { opp_conf: "Big Ten", record: "1-1", win_pct: 50, twv_50: 0.4 },
      { opp_conf: "Big 12", record: "0-2", win_pct: 0, twv_50: -0.8 },
    ],
  };
  const wcc: Conference = {
    ...conf("WCC", [team("Gonzaga", 1, 100)], 1),
    vs_power: [{ opp_conf: "SEC", record: "2-0", win_pct: 100, twv_50: 1.2 }],
  };

  it("lists every power opponent in name order", () => {
    expect(powerConferences([mvc, wcc])).toEqual(["Big 12", "Big Ten", "SEC"]);
  });

  it("shows conference TWV per team and leaves unplayed conferences empty", () => {
    const opps = powerConferences([mvc, wcc]);
    const ranges = computePowerRanges([mvc, wcc], opps);
    const [big12, bigTen, sec] = powerConferenceSections(mvc, opps, ranges);
    expect(big12.record).toBe("0-2");
    expect(big12.twv).toBeCloseTo(-0.4);
    expect(bigTen.twv).toBeCloseTo(0.2);
    expect(bigTen.expectedTwv).toBeCloseTo(0.4);
    expect(sec.empty).toBe(true);
    expect(expectedWinPct(bigTen.record, bigTen.expectedTwv)).toBeCloseTo(30);
  });

  it("gives team rows their own breakdown", () => {
    const opps = ["Big 12", "Big Ten"];
    const ranges = computePowerRanges([mvc], opps);
    const [big12, bigTen] = powerTeamSections(drake, opps, ranges);
    expect(big12.empty).toBe(true);
    expect(bigTen.record).toBe("1-0");
    expect(bigTen.twv).toBeCloseTo(0.6);
  });

  it("sorts by a power column with conferences that never played it last", () => {
    const rows = [wcc, mvc];
    expect(sortPowerConferences(rows, "Big Ten_win_pct", "desc").map((r) => r.team_conf)).toEqual([
      "Missouri Valley",
      "WCC",
    ]);
    expect(sortPowerConferences(rows, "Big Ten_win_pct", "asc").map((r) => r.team_conf)).toEqual([
      "Missouri Valley",
      "WCC",
    ]);
    expect(sortPowerConferences(rows, "SEC_twv_50", "desc").map((r) => r.team_conf)).toEqual([
      "WCC",
      "Missouri Valley",
    ]);
  });
});
