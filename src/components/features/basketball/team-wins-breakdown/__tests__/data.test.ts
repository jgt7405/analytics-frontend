import { CHART_HEIGHT, PADDING } from "../constants";
import {
  barSecondaryColor,
  computeLayout,
  confLogoPath,
  confTourneyGames,
  locationStyle,
  logoPositions,
  seedThresholds,
  splitGames,
  winProbCellStyle,
} from "../data";
import type { BasketballTeamGame, ConfChampData } from "../types";

const row = (over: Partial<ConfChampData>): ConfChampData =>
  ({
    team_name: "Duke",
    pct_prob_win_conf_tourney_game_1: 0,
    pct_prob_win_conf_tourney_game_2: 0,
    pct_prob_win_conf_tourney_game_3: 0,
    pct_prob_win_conf_tourney_game_4: 0,
    pct_prob_win_conf_tourney_game_5: 0,
    pct_prob_win_conf_tourney_game_6: 0,
    wins_for_bubble: 20,
    wins_for_1_seed: 28,
    wins_for_4_seed: 25,
    wins_for_7_seed: 23,
    wins_for_10_seed: 21,
    season_total_proj_wins_avg: 24,
    ...over,
  }) as ConfChampData;

const game = (over: Partial<BasketballTeamGame>): BasketballTeamGame => ({
  date: "01/10",
  opponent: "Virginia",
  location: "Home",
  status: "W",
  team_win_prob: 0.8,
  ...over,
});

describe("confLogoPath and barSecondaryColor", () => {
  it("turns spaces and hyphens into underscores", () => {
    expect(confLogoPath("Mid-American")).toBe("/images/conf_logos/Mid_American.png");
    expect(confLogoPath("Atlantic Coast")).toBe("/images/conf_logos/Atlantic_Coast.png");
  });

  it("uses the team's secondary color, else a contrasting fallback", () => {
    expect(barSecondaryColor("#123456", "#abcdef")).toBe("#abcdef");
    expect(barSecondaryColor("#3b82f6")).toBe("#ef4444");
    expect(barSecondaryColor("#10b981")).toBe("#3b82f6");
    expect(barSecondaryColor("#000000")).toBe("#ef4444");
  });
});

describe("confTourneyGames", () => {
  it("adds one neutral-site game per round the team might play", () => {
    const games = confTourneyGames(
      row({ pct_prob_win_conf_tourney_game_1: 80, pct_prob_win_conf_tourney_game_2: 40 }),
      "/logo.png",
    );
    expect(games.map((g) => [g.opponent, g.winProb])).toEqual([
      ["Conf Tourney Game 1", 0.8],
      ["Conf Tourney Game 2", 0.4],
    ]);
    expect(games[0]).toMatchObject({ location: "Neutral", opponent_logo: "/logo.png" });
    expect(confTourneyGames(null, "/logo.png")).toEqual([]);
  });
});

describe("splitGames", () => {
  it("sorts wins and remaining games by win probability, tournament games included", () => {
    const { completedWins, remainingGames, totalWins } = splitGames(
      [
        game({ opponent: "A", status: "W", team_win_prob: 0.4 }),
        game({ opponent: "B", status: "W", team_win_prob: 0.9 }),
        game({ opponent: "C", status: "L", team_win_prob: 0.5 }),
        game({ opponent: "D", status: "02/01", team_win_prob: 0.3 }),
        game({ opponent: "E", status: "02/05", team_win_prob: undefined }),
      ],
      [{ ...game({ opponent: "Conf Tourney Game 1", status: "Projected" }), winProb: 0.6 }],
    );
    expect(totalWins).toBe(2);
    expect(completedWins.map((g) => g.opponent)).toEqual(["B", "A"]);
    expect(remainingGames.map((g) => g.opponent)).toEqual(["Conf Tourney Game 1", "D"]);
  });
});

describe("computeLayout and logoPositions", () => {
  it("scales wins onto the bar", () => {
    const layout = computeLayout(false, 5, 10);
    const bottom = CHART_HEIGHT - PADDING - 20;
    expect(layout.chartAreaBottom).toBe(bottom);
    expect(layout.getYFromWins(0)).toBe(bottom);
    expect(layout.getYFromWins(10)).toBe(PADDING);
    expect(layout.barTopY).toBeCloseTo((bottom + PADDING) / 2);
    expect(computeLayout(false, 0, 0).getYFromWins(5)).toBe(bottom);
    expect(computeLayout(true, 0, 1).regionRight).toBeLessThan(computeLayout(false, 0, 1).regionRight);
  });

  it("puts each game's row at the middle of its bar slot", () => {
    const layout = computeLayout(false, 1, 2);
    const positions = logoPositions(
      [
        { ...game({ opponent: "A" }), winProb: 0.9 },
        { ...game({ opponent: "B" }), winProb: 0.5 },
      ],
      layout,
    );
    expect(positions.map((p) => p.gameNumber)).toEqual([1, 2]);
    expect(positions[0].yPosition).toBeCloseTo(layout.getYFromWins(0.5));
    expect(positions[1].yPosition).toBeCloseTo(layout.getYFromWins(1.5));
  });
});

describe("cell styles", () => {
  it("reads seed thresholds, 0 when missing", () => {
    expect(seedThresholds(row({ wins_for_bubble: undefined as unknown as number }))).toMatchObject({
      bubbleWins: 0,
      seed1Wins: 28,
    });
  });

  it("colors win probability yellow → white → blue with readable text", () => {
    expect(winProbCellStyle(0)).toEqual({ backgroundColor: "rgb(255, 230, 113)", textColor: "#000000" });
    expect(winProbCellStyle(50)).toEqual({ backgroundColor: "rgb(255, 255, 255)", textColor: "#000000" });
    expect(winProbCellStyle(100)).toEqual({ backgroundColor: "rgb(24, 98, 123)", textColor: "#ffffff" });
  });

  it("maps locations to a letter and colors", () => {
    expect(locationStyle("Home").letter).toBe("H");
    expect(locationStyle("Away").letter).toBe("A");
    expect(locationStyle("Neutral")).toMatchObject({ label: "Neutral", letter: "N" });
    expect(locationStyle("")).toMatchObject({ label: "Neutral", letter: "N" });
  });
});
