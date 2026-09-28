import { MARGIN, PLOT_HEIGHT } from "../constants";
import {
  comparisonGames,
  computePercentiles,
  computeTeamStats,
  filterDescription,
  filterTeamGames,
  formatGameDate,
  gameRank,
  layoutGames,
  positionGames,
  similarDifficulty,
} from "../data";
import type { AllScheduleGame, FootballTeamGame } from "../types";

const game = (over: Partial<FootballTeamGame>): FootballTeamGame => ({
  date: "09/06",
  opponent: "Georgia",
  location: "Home",
  status: "W",
  sag12_win_prob: 0.5,
  ...over,
});

const league = (over: Partial<AllScheduleGame>): AllScheduleGame => ({
  team: "Alabama",
  opponent: "Georgia",
  sag12_win_prob: 0.5,
  team_conf: "Southeastern",
  team_conf_catg: "Power 4",
  status: "W",
  ...over,
});

describe("filterTeamGames", () => {
  const schedule = [
    game({ opponent: "A", status: "W" }),
    game({ opponent: "B", status: "L" }),
    game({ opponent: "C", status: "11/29" }),
    game({ opponent: "D", sag12_win_prob: undefined }),
  ];
  const names = (games: FootballTeamGame[]) => games.map((g) => g.opponent);

  it("drops games without a win probability, and everything without league data", () => {
    expect(names(filterTeamGames(schedule, [], "all"))).toEqual(["A", "B", "C"]);
    expect(filterTeamGames(schedule, undefined, "all")).toEqual([]);
  });

  it("filters by result", () => {
    expect(names(filterTeamGames(schedule, [], "completed"))).toEqual(["A", "B"]);
    expect(names(filterTeamGames(schedule, [], "wins"))).toEqual(["A"]);
    expect(names(filterTeamGames(schedule, [], "losses"))).toEqual(["B"]);
    expect(names(filterTeamGames(schedule, [], "remaining"))).toEqual(["C"]);
  });
});

describe("comparisonGames", () => {
  const all = [
    league({ team_conf: "Southeastern", team_conf_catg: "Power 4" }),
    league({ team_conf: "Sun Belt", team_conf_catg: "Non Power 4" }),
    league({ team_conf: "FCS", team_conf_catg: "FCS" }),
  ];

  it("never includes FCS games and keeps the chosen group", () => {
    expect(comparisonGames(all, "all_fbs", undefined, "all")).toHaveLength(2);
    expect(comparisonGames(all, "power_4", undefined, "all")).toHaveLength(1);
    expect(comparisonGames(all, "non_power_4", undefined, "all")).toHaveLength(1);
    expect(comparisonGames(all, "conference", "Sun Belt", "all")).toHaveLength(1);
  });
});

describe("percentiles, positions and layout", () => {
  const dataset = Array.from({ length: 10 }, (_, i) => league({ sag12_win_prob: (i + 1) / 10 }));
  const percentiles = computePercentiles(dataset);

  it("gives 11 percentile values, the last uncapped", () => {
    expect(percentiles).toHaveLength(11);
    expect(percentiles[0]).toEqual({ percentile: 0, value: 0.1 });
    expect(percentiles[10]).toEqual({ percentile: 100, value: 1 });
    expect(computePercentiles([])).toEqual([]);
  });

  it("interpolates a game's percentile position", () => {
    expect(positionGames([game({ sag12_win_prob: 0.05 })], percentiles)[0].percentilePosition).toBe(0);
    const [middle] = positionGames([game({ sag12_win_prob: 0.55 })], percentiles);
    expect(middle.percentilePosition).toBeGreaterThan(40);
    expect(middle.percentilePosition).toBeLessThan(60);
    expect(positionGames([game({})], [])).toEqual([]);
  });

  it("alternates sides and keeps logos on a side at least 36px apart", () => {
    const games = Array.from({ length: 6 }, (_, i) => ({
      ...game({ opponent: `T${i}` }),
      percentilePosition: 50,
      gameIndex: i,
    }));
    const laid = layoutGames(games);
    expect(laid.filter((g) => g.isRightSide)).toHaveLength(3);
    for (const side of [true, false]) {
      const ys = laid.filter((g) => g.isRightSide === side).map((g) => g.adjustedY).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(36);
      for (const y of ys) {
        expect(y).toBeGreaterThanOrEqual(MARGIN.top + 16);
        expect(y).toBeLessThanOrEqual(MARGIN.top + PLOT_HEIGHT - 16);
      }
    }
  });
});

describe("stats and tooltip figures", () => {
  it("computes record, forecast and TWV from completed games", () => {
    const stats = computeTeamStats([
      game({ status: "W", sag12_win_prob: 0.6 }),
      game({ status: "L", sag12_win_prob: 0.4 }),
    ]);
    expect(stats).toMatchObject({ wins: 1, losses: 1, actualWinPct: 50 });
    expect(stats.expectedWins).toBeCloseTo(1);
    expect(stats.twv).toBeCloseTo(0);
  });

  it("shows 0-0 and TWV 0 for remaining games only", () => {
    const stats = computeTeamStats([game({ status: "11/29", sag12_win_prob: 0.7 })]);
    expect(stats).toMatchObject({ wins: 0, losses: 0, twv: 0, actualWinPct: 0 });
    expect(stats.forecastWinPct).toBeCloseTo(70);
  });

  it("ranks by lower win probability, breaking ties by opponent rating", () => {
    const dataset = [
      league({ sag12_win_prob: 0.2 }),
      league({ sag12_win_prob: 0.5, opp_rating: 90 }),
      league({ sag12_win_prob: 0.5, opp_rating: 70 }),
    ];
    expect(gameRank(dataset, game({ sag12_win_prob: 0.5, opp_rating: 80 }))).toBe(3);
    expect(gameRank(dataset, game({ sag12_win_prob: 0.1 }))).toBe(1);
  });

  it("summarizes games within 5 points of the win probability", () => {
    const dataset = [
      league({ sag12_win_prob: 0.52, status: "W" }),
      league({ sag12_win_prob: 0.48, status: "L" }),
      league({ sag12_win_prob: 0.5, status: "11/29" }),
      league({ sag12_win_prob: 0.9, status: "W" }),
    ];
    expect(similarDifficulty(dataset, game({ sag12_win_prob: 0.5 }))).toEqual({
      total: 3,
      wins: 1,
      losses: 1,
      scheduled: 1,
    });
  });

  it("describes the comparison group and formats dates", () => {
    expect(filterDescription("conference", "Big Ten")).toBe("Big Ten conference");
    expect(filterDescription("power_4", undefined)).toBe("Power 4 conferences");
    expect(formatGameDate("09/06")).toBe("Sep 6");
    expect(formatGameDate("")).toBe("TBD");
    expect(formatGameDate("13/01")).toBe("TBD");
  });
});
