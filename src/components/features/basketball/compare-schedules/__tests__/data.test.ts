import { MARGIN, PLOT_HEIGHT } from "../constants";
import {
  comparisonGames,
  computePercentiles,
  computeTeamStats,
  difficultyRank,
  filterTeamGames,
  layoutGames,
  percentilePosition,
  winProbAtPercentile,
} from "../data";
import type { AllScheduleGame, TeamSchedule } from "../types";

type Game = TeamSchedule["games"][number];

const game = (over: Partial<Game>): Game => ({
  date: "01/10",
  opponent: "Virginia",
  opponentColor: "#000",
  winProb: 0.5,
  status: "W",
  location: "Home",
  ...over,
});

const league = (over: Partial<AllScheduleGame>): AllScheduleGame => ({
  team: "Duke",
  opponent: "Virginia",
  opponentColor: "#000",
  winProb: 0.5,
  teamConference: "Atlantic Coast",
  status: "W",
  ...over,
});

const team = (name: string, games: Game[], allScheduleData: AllScheduleGame[] = []): TeamSchedule => ({
  teamName: name,
  teamLogo: "",
  teamColor: "#001A57",
  teamConference: "Atlantic Coast",
  games,
  allScheduleData,
});

describe("filterTeamGames", () => {
  it("keeps games with a win probability, by result and location, numbered per team", () => {
    const teams = [
      team("Duke", [
        game({ opponent: "A", status: "W", location: "Home" }),
        game({ opponent: "B", status: "02/01", location: "Away" }),
        game({ opponent: "C", winProb: 0 }),
      ]),
      team("UNC", [game({ opponent: "D", winProb: 0.97 })]),
    ];
    const all = filterTeamGames(teams, "all", "all");
    expect(all.map((g) => [g.teamIndex, g.gameIndex, g.opponent])).toEqual([
      [0, 0, "A"],
      [0, 1, "B"],
      [1, 0, "D"],
    ]);
    expect(all[2].isHighProb).toBe(true);
    expect(filterTeamGames(teams, "remaining", "all").map((g) => g.opponent)).toEqual(["B"]);
    expect(filterTeamGames(teams, "all", "away").map((g) => g.opponent)).toEqual(["B"]);
  });
});

describe("comparisonGames", () => {
  const data = [
    league({ teamConfCategory: "Power" }),
    league({ teamConference: "Ivy League" }),
    league({ winProb: 0.99 }),
  ];
  const teams = [team("Duke", [game({})], data), team("UNC", [game({ opponent: "X" })])];

  it("filters the first team's league data by group, <= 95% only", () => {
    expect(comparisonGames(teams, [], "all_d1", "all")).toHaveLength(2);
    expect(comparisonGames(teams, [], "power_6", "all")).toHaveLength(1);
    expect(comparisonGames(teams, [], "non_power_6", "all")).toHaveLength(1);
    expect(comparisonGames([], [], "all_d1", "all")).toEqual([]);
  });

  it("uses the selected teams' own games for Teams Selected", () => {
    const shown = filterTeamGames(teams, "all", "all");
    const result = comparisonGames(teams, shown, "teams_selected", "all");
    expect(result.map((g) => g.team)).toEqual(["Duke", "UNC"]);
  });
});

describe("percentiles", () => {
  const dataset = Array.from({ length: 10 }, (_, i) => league({ winProb: (i + 1) / 10 - 0.05 }));
  const percentiles = computePercentiles(dataset);

  it("computes 11 values, the last capped at 95%", () => {
    expect(percentiles).toHaveLength(11);
    expect(percentiles[10].value).toBeCloseTo(0.95);
  });

  it("positions a win probability (50 with no data, 100 at or past the top)", () => {
    expect(percentilePosition(0.5, [])).toBe(50);
    expect(percentilePosition(0.99, percentiles)).toBe(100);
    expect(percentilePosition(0.01, percentiles)).toBe(0);
    const middle = percentilePosition(0.5, percentiles);
    expect(middle).toBeGreaterThan(40);
    expect(middle).toBeLessThan(60);
  });

  it("reads the win probability for a gridline", () => {
    expect(winProbAtPercentile(0, percentiles)).toBeCloseTo(0.05);
    expect(winProbAtPercentile(50, [])).toBe(0);
  });

  it("ranks a game by how many comparison games are at least as hard", () => {
    expect(difficultyRank(dataset, 0.3)).toBe(3);
  });
});

describe("computeTeamStats", () => {
  it("counts >95% games into the record and keeps their own tally", () => {
    const teams = [
      team("Duke", [
        game({ status: "W", winProb: 0.6 }),
        game({ status: "L", winProb: 0.4 }),
        game({ status: "W", winProb: 0.98 }),
      ]),
    ];
    const stats = computeTeamStats(teams, filterTeamGames(teams, "all", "all"))[0];
    expect(stats).toMatchObject({ wins: 2, losses: 1, highProbWins: 1, highProbLosses: 0, highProbGames: 1 });
    expect(stats.expectedWins).toBeCloseTo(1.98);
  });

  it("shows 0-0 when only remaining games are shown", () => {
    const teams = [team("Duke", [game({ status: "03/01", winProb: 0.7 })])];
    const stats = computeTeamStats(teams, filterTeamGames(teams, "all", "all"))[0];
    expect(stats).toMatchObject({ wins: 0, losses: 0, twv_50: 0 });
    expect(stats.forecastWinPct).toBeCloseTo(70);
  });
});

describe("layoutGames", () => {
  it("alternates sides within a column and keeps logos 22px apart inside the plot", () => {
    const games = Array.from({ length: 6 }, (_, i) => ({
      teamIndex: 0,
      gameIndex: i,
      opponent: `T${i}`,
      opponentColor: "#000",
      winProb: 0.5,
      status: "W",
      location: "Home",
      teamConference: "ACC",
      isHighProb: false,
      percentilePosition: 50,
    }));
    const laid = layoutGames(games, 1);
    expect(laid.filter((g) => g.isRightSide)).toHaveLength(3);
    for (const side of [true, false]) {
      const ys = laid.filter((g) => g.isRightSide === side).map((g) => g.adjustedY);
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(22);
      expect(Math.max(...ys)).toBeLessThanOrEqual(MARGIN.top + PLOT_HEIGHT - 12);
    }
  });
});
