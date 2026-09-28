import { MARGIN, PLOT_HEIGHT } from "../constants";
import {
  comparisonGames,
  computePercentiles,
  computeTeamStats,
  difficultyRank,
  filterTeamGames,
  layoutGames,
  percentilePosition,
} from "../data";
import type { AllScheduleGame, TeamSchedule } from "../types";

type Game = TeamSchedule["games"][number];

const game = (over: Partial<Game>): Game => ({
  date: "09/06",
  opponent: "Georgia",
  opponentColor: "#000",
  winProb: 0.5,
  status: "W",
  location: "Home",
  ...over,
});

const league = (over: Partial<AllScheduleGame>): AllScheduleGame => ({
  team: "Alabama",
  opponent: "Georgia",
  opponentColor: "#000",
  winProb: 0.5,
  teamConference: "SEC",
  status: "W",
  ...over,
});

const team = (name: string, games: Game[], allScheduleData: AllScheduleGame[] = []): TeamSchedule => ({
  teamName: name,
  teamLogo: "",
  teamColor: "#9E1B32",
  teamConference: "SEC",
  games,
  allScheduleData,
});

describe("filterTeamGames and comparisonGames", () => {
  it("keeps games with a win probability, by result", () => {
    const teams = [team("Alabama", [game({ opponent: "A" }), game({ opponent: "B", status: "11/29" }), game({ opponent: "C", winProb: 0 })])];
    expect(filterTeamGames(teams, "all").map((g) => g.opponent)).toEqual(["A", "B"]);
    expect(filterTeamGames(teams, "remaining").map((g) => g.opponent)).toEqual(["B"]);
  });

  it("combines every selected team's league data, never FCS", () => {
    const teams = [
      team("Alabama", [], [league({}), league({ teamConference: "FCS" })]),
      team("Toledo", [], [league({ teamConference: "Mid-American", teamConfCategory: "Non Power 4" })]),
    ];
    expect(comparisonGames(teams, [], "all_fbs", "all")).toHaveLength(2);
    expect(comparisonGames(teams, [], "power_4", "all")).toHaveLength(1);
    expect(comparisonGames(teams, [], "non_power_4", "all")).toHaveLength(1);
  });

  it("uses the selected teams' own games for Teams Selected", () => {
    const teams = [team("Alabama", [game({}), game({ winProb: 0.99 })])];
    expect(comparisonGames(teams, filterTeamGames(teams, "all"), "teams_selected", "all")).toHaveLength(2);
  });
});

describe("percentiles and ranks", () => {
  const dataset = Array.from({ length: 10 }, (_, i) => league({ winProb: (i + 1) / 10 }));
  const percentiles = computePercentiles(dataset);

  it("computes 11 values, the last uncapped", () => {
    expect(percentiles).toHaveLength(11);
    expect(percentiles[10]).toEqual({ percentile: 100, value: 1 });
    expect(computePercentiles([])).toEqual([]);
  });

  it("positions a win probability (50 with no data)", () => {
    expect(percentilePosition(0.3, [])).toBe(50);
    expect(percentilePosition(0.05, percentiles)).toBe(0);
    expect(percentilePosition(1, percentiles)).toBe(100);
  });

  it("ranks a game by how many comparison games are at least as hard", () => {
    expect(difficultyRank(dataset, 0.3)).toBe(3);
  });
});

describe("computeTeamStats", () => {
  it("computes record and TWV from completed games, 0-0 for remaining only", () => {
    const completed = [team("Alabama", [game({ status: "W", winProb: 0.6 }), game({ status: "L", winProb: 0.4 })])];
    expect(computeTeamStats(completed, filterTeamGames(completed, "all"))[0]).toMatchObject({
      wins: 1,
      losses: 1,
      actualWinPct: 50,
    });
    const remaining = [team("Alabama", [game({ status: "11/29", winProb: 0.7 })])];
    const stats = computeTeamStats(remaining, filterTeamGames(remaining, "all"))[0];
    expect(stats).toMatchObject({ wins: 0, losses: 0, twv: 0 });
    expect(stats.forecastWinPct).toBeCloseTo(70);
  });
});

describe("layoutGames", () => {
  it("cascades each team's logos at least 32px apart and compresses overflow into the plot", () => {
    const games = Array.from({ length: 20 }, (_, i) => ({
      teamIndex: 0,
      gameIndex: i,
      opponent: `T${i}`,
      opponentColor: "#000",
      winProb: 0.5,
      status: "W",
      teamConference: "SEC",
      percentilePosition: 50,
    }));
    const few = layoutGames(games.slice(0, 3)).map((g) => g.adjustedY);
    for (let i = 1; i < few.length; i++) expect(few[i] - few[i - 1]).toBeGreaterThanOrEqual(32);
    const many = layoutGames(games).map((g) => g.adjustedY);
    expect(Math.max(...many)).toBeLessThanOrEqual(MARGIN.top + PLOT_HEIGHT - 15 + 1e-9);
  });
});
