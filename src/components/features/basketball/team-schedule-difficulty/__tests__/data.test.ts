import {
  comparisonGames,
  computePercentiles,
  computeTeamStats,
  difficultyRank,
  filterTeamGames,
  highProbabilityRecord,
  layoutGames,
  positionGames,
  splitByThreshold,
} from "../data";
import { TOP_MARGIN, TOP_PLOT_HEIGHT } from "../constants";
import type { AllScheduleGame, BasketballTeamGame } from "../types";

const game = (over: Partial<BasketballTeamGame>): BasketballTeamGame => ({
  date: "01/10",
  opponent: "Virginia",
  location: "Home",
  status: "W",
  rk50_win_prob: 0.5,
  ...over,
});

const league = (over: Partial<AllScheduleGame>): AllScheduleGame => ({
  team: "Duke",
  opponent: "Virginia",
  rk50_win_prob: 0.5,
  team_conf: "Atlantic Coast",
  status: "W",
  ...over,
});

describe("filterTeamGames", () => {
  const schedule = [
    game({ opponent: "A", status: "W", location: "Home" }),
    game({ opponent: "B", status: "L", location: "Away" }),
    game({ opponent: "C", status: "2026-02-07", location: "Neutral" }),
    game({ opponent: "D", rk50_win_prob: undefined }),
  ];
  const names = (games: BasketballTeamGame[]) => games.map((g) => g.opponent);

  it("drops games without a win probability, and everything when there is no league data", () => {
    expect(names(filterTeamGames(schedule, [], "all", "all"))).toEqual(["A", "B", "C"]);
    expect(filterTeamGames(schedule, undefined, "all", "all")).toEqual([]);
  });

  it("filters by result and location", () => {
    expect(names(filterTeamGames(schedule, [], "completed", "all"))).toEqual(["A", "B"]);
    expect(names(filterTeamGames(schedule, [], "wins", "all"))).toEqual(["A"]);
    expect(names(filterTeamGames(schedule, [], "losses", "all"))).toEqual(["B"]);
    expect(names(filterTeamGames(schedule, [], "remaining", "all"))).toEqual(["C"]);
    expect(names(filterTeamGames(schedule, [], "all", "away"))).toEqual(["B"]);
    expect(names(filterTeamGames(schedule, [], "all", "neutral"))).toEqual(["C"]);
  });
});

describe("splitByThreshold", () => {
  it("puts games above 95% in the high group", () => {
    const { lowProbGames, highProbGames } = splitByThreshold([
      game({ rk50_win_prob: 0.95 }),
      game({ rk50_win_prob: 0.96 }),
    ]);
    expect(lowProbGames).toHaveLength(1);
    expect(highProbGames).toHaveLength(1);
  });
});

describe("comparisonGames", () => {
  const all = [
    league({ team_conf: "Atlantic Coast", team_conf_catg: "Power" }),
    league({ team_conf: "Big Ten" }),
    league({ team_conf: "Ivy League" }),
    league({ team_conf: "Ivy League", rk50_win_prob: 0.99 }),
  ];

  it("keeps games at or below 95% in the chosen group", () => {
    expect(comparisonGames(all, "all_d1", undefined, "all")).toHaveLength(3);
    expect(comparisonGames(all, "power_6", undefined, "all")).toHaveLength(2);
    expect(comparisonGames(all, "non_power_6", undefined, "all")).toHaveLength(1);
    expect(comparisonGames(all, "conference", "Ivy League", "all")).toHaveLength(1);
  });

  it("applies the result filter", () => {
    const mixed = [league({ status: "W" }), league({ status: "L" }), league({ status: "2026-03-01" })];
    expect(comparisonGames(mixed, "all_d1", undefined, "remaining")).toHaveLength(1);
    expect(comparisonGames(mixed, "all_d1", undefined, "completed")).toHaveLength(2);
  });
});

describe("computePercentiles and positionGames", () => {
  const dataset = Array.from({ length: 10 }, (_, i) => league({ rk50_win_prob: (i + 1) / 10 - 0.05 }));
  const percentiles = computePercentiles(dataset);

  it("gives 11 percentile values, the last capped at the threshold", () => {
    expect(percentiles).toHaveLength(11);
    expect(percentiles[0]).toEqual({ percentile: 0, value: 0.05 });
    expect(percentiles[10].percentile).toBe(100);
    expect(percentiles[10].value).toBeCloseTo(0.95);
    expect(computePercentiles([])).toEqual([]);
  });

  it("interpolates a game's percentile position", () => {
    const [positioned] = positionGames([game({ rk50_win_prob: 0.05 })], percentiles);
    expect(positioned.percentilePosition).toBe(0);
    const [middle] = positionGames([game({ rk50_win_prob: 0.5 })], percentiles);
    expect(middle.percentilePosition).toBeGreaterThan(40);
    expect(middle.percentilePosition).toBeLessThan(60);
    expect(positionGames([game({})], [])).toEqual([]);
  });
});

describe("layoutGames", () => {
  it("deals games into four columns and keeps logos in one column at least 28px apart", () => {
    const games = Array.from({ length: 8 }, (_, i) => ({
      ...game({ opponent: `T${i}` }),
      percentilePosition: 50,
      gameIndex: i,
      isHighProb: false,
    }));
    const laid = layoutGames(games);
    expect(new Set(laid.map((g) => g.columnIndex))).toEqual(new Set([0, 1, 2, 3]));
    for (const col of [0, 1, 2, 3]) {
      const ys = laid.filter((g) => g.columnIndex === col).map((g) => g.adjustedY).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(28);
      for (const y of ys) {
        expect(y).toBeGreaterThanOrEqual(TOP_MARGIN.top + 15);
        expect(y).toBeLessThanOrEqual(TOP_MARGIN.top + TOP_PLOT_HEIGHT - 15);
      }
    }
    expect(laid.filter((g) => g.isRightSide).map((g) => g.columnIndex).every((c) => c >= 2)).toBe(true);
  });
});

describe("records and stats", () => {
  it("counts the >95% record", () => {
    expect(
      highProbabilityRecord([game({ status: "W" }), game({ status: "L" }), game({ status: "2026-03-01" })]),
    ).toEqual({ wins: 1, losses: 1, remaining: 1 });
  });

  it("computes record, forecast and TWV from completed games", () => {
    const low = [game({ status: "W", rk50_win_prob: 0.6 }), game({ status: "L", rk50_win_prob: 0.4 })];
    const high = [game({ status: "W", rk50_win_prob: 1 })];
    const stats = computeTeamStats(low, high, highProbabilityRecord(high));
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.expectedWins).toBeCloseTo(2);
    expect(stats.twv_50).toBeCloseTo(0);
    expect(stats.actualWinPct).toBeCloseTo(66.67, 1);
    expect(stats.highProbGames).toBe(1);
  });

  it("shows a 0-0 record and TWV 0 when only remaining games are shown", () => {
    const remaining = [game({ status: "2026-03-01", rk50_win_prob: 0.7 })];
    const stats = computeTeamStats(remaining, [], highProbabilityRecord([]));
    expect(stats).toMatchObject({ wins: 0, losses: 0, twv_50: 0, actualWinPct: 0 });
    expect(stats.expectedWins).toBeCloseTo(0.7);
    expect(stats.forecastWinPct).toBeCloseTo(70);
  });

  it("ranks a game among the comparison games", () => {
    const dataset = [0.1, 0.3, 0.5].map((p) => league({ rk50_win_prob: p }));
    expect(difficultyRank(dataset, 0.3)).toBe(2);
    expect(difficultyRank(dataset, 0.9)).toBe(3);
  });
});
