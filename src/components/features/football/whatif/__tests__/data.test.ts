import type { AllTeamCFPEntry, WhatIfGame, WhatIfTeamResult } from "@/types/football";
import {
  confChampRows,
  currentCFPRows,
  filterGames,
  groupByDate,
  pickedOutcomes,
  teamNames,
  top2Probability,
  whatIfCFPRows,
} from "../data";

const team = (over: Partial<WhatIfTeamResult>): WhatIfTeamResult =>
  ({
    team_name: "Utah",
    team_id: 1,
    conference: "Big 12",
    logo_url: "/images/team_logos/utah.png",
    conf_champ_game_played: 716,
    totalscenarios: 1000,
    cfp_probability: 58.7,
    ...over,
  }) as WhatIfTeamResult;

const game = (over: Partial<WhatIfGame>): WhatIfGame => ({
  game_id: 1,
  date: "2026-10-03",
  home_team: "Utah",
  away_team: "BYU",
  home_team_id: 1,
  away_team_id: 2,
  home_probability: 0.6,
  away_probability: 0.4,
  completed: false,
  conf_game: true,
  ...over,
});

describe("table rows", () => {
  it("turns title-game appearances into a percentage (1000 scenarios by default)", () => {
    expect(top2Probability(team({}))).toBeCloseTo(71.6);
    expect(top2Probability(team({ totalscenarios: 0 }))).toBeCloseTo(71.6);
  });

  it("puts the probability in the current or what-if column", () => {
    expect(confChampRows([team({})], "current")[0]).toMatchObject({ currentProb: 71.6, whatIfProb: 0 });
    expect(confChampRows([team({})], "whatif")[0]).toMatchObject({ currentProb: 0, whatIfProb: 71.6 });
  });

  it("uses the all-teams CFP list only when shown and loaded", () => {
    const all = [{ team_name: "Texas", logo_url: "", CFP_First_Round: 98.6 }];
    expect(currentCFPRows([team({})], all, true)[0]).toMatchObject({ team_id: "Texas", currentProb: 98.6 });
    expect(currentCFPRows([team({})], [], true)[0]).toMatchObject({ team_name: "Utah", currentProb: 58.7 });
    expect(currentCFPRows([team({})], all, false)[0].team_name).toBe("Utah");
  });

  it("has no what-if CFP rows before a calculation, and splits bids after", () => {
    expect(whatIfCFPRows([], [], false)).toBeUndefined();
    const rows = whatIfCFPRows([team({ auto_bid_pct: 30, atlarge_pct: 28 })], [], false)!;
    expect(rows[0]).toMatchObject({ whatIfProb: 58.7, whatIfAutoPct: 30, whatIfAtLargePct: 28, whatIfConfNoBidPct: 0 });
    const all = [{ team_name: "Texas", logo_url: "", cfp_probability: 90 } as AllTeamCFPEntry];
    expect(whatIfCFPRows([team({})], all, true)![0]).toMatchObject({ team_id: "Texas", whatIfProb: 90 });
  });
});

describe("games", () => {
  const conf = [game({ game_id: 1 }), game({ game_id: 2, date: "2026-10-10", home_team: "TCU", away_team: "Baylor" })];
  const fbs = [...conf, game({ game_id: 3, home_team: "Ohio State", away_team: "Michigan" })];

  it("lists searched teams' games, all FBS games, or the conference's", () => {
    expect(filterGames(conf, fbs, "conference", []).map((g) => g.game_id)).toEqual([1, 2]);
    expect(filterGames(conf, fbs, "all", []).map((g) => g.game_id)).toEqual([1, 2, 3]);
    expect(filterGames(conf, fbs, "conference", ["Michigan"]).map((g) => g.game_id)).toEqual([3]);
    expect(filterGames(conf, [], "conference", ["TCU"]).map((g) => g.game_id)).toEqual([2]);
  });

  it("groups by date and collects team names", () => {
    expect(Object.keys(groupByDate(conf))).toEqual(["2026-10-03", "2026-10-10"]);
    expect(teamNames(conf, []).sort()).toEqual(["BYU", "Baylor", "TCU", "Utah"]);
  });

  it("describes picked outcomes by date, away team on the left", () => {
    const picks = new Map<number, string>([
      [2, "2"],
      [1, "1"],
      [99, "1"],
    ]);
    const outcomes = pickedOutcomes(picks, conf, []);
    expect(outcomes.map((o) => o.gameId)).toEqual([1, 2]);
    expect(outcomes[0]).toMatchObject({ leftTeam: "BYU", leftIsWinner: false, rightTeam: "Utah", rightIsWinner: true });
  });
});
