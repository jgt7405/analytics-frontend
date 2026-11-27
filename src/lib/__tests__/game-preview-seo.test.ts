import {
  chanceLabel,
  easternToday,
  findPreviewGame,
  indexablePreviewGames,
  gameDate,
  gameFavorite,
  gamePreviewDescription,
  gamePreviewPath,
  gamePreviewTitle,
  gameSite,
} from "@/lib/game-preview-seo";
import type { UpcomingGame } from "@/types/gamePreview";

function game(overrides: Partial<UpcomingGame> = {}): UpcomingGame {
  return {
    date: "11/28",
    date_sort: "2026-11-28",
    home_team: "Dayton",
    away_team: "Nevada",
    home_team_logo: "",
    away_team_logo: "",
    home_team_conference: "Atlantic 10",
    away_team_conference: "Mountain West",
    home_team_color: "",
    away_team_color: "",
    is_conference_game: false,
    location: "Home",
    home_win_prob: 0.6449,
    away_win_prob: 0.3551,
    win_prob: 0.6449,
    label: "",
    is_next_game_for_both: true,
    game_id: "2026-11-28-dayton-nevada",
    ...overrides,
  };
}

describe("game preview search wording", () => {
  it("dates the game by its calendar day, not the server's time zone", () => {
    expect(gameDate("2026-11-28")).toEqual({
      short: "Nov 28",
      long: "Saturday, November 28, 2026",
    });
    expect(gameDate("2027-03-01")?.long).toBe("Monday, March 1, 2027");
    expect(gameDate("11/28")).toBeNull();
  });

  it("names the favorite and both chances in whole percents", () => {
    expect(gameFavorite(game())).toEqual({
      team: "Dayton",
      opponent: "Nevada",
      pct: 64,
      opponentPct: 36,
    });
    expect(gameFavorite(game({ home_win_prob: 0.3, away_win_prob: 0.7 }))?.team).toBe("Nevada");
  });

  it("has no favorite without probabilities or in a 50-50 game", () => {
    expect(gameFavorite(game({ home_win_prob: null }))).toBeNull();
    expect(gameFavorite(game({ home_win_prob: 0.501, away_win_prob: 0.499 }))).toBeNull();
  });

  it("words the title and description the way the game is searched", () => {
    expect(gamePreviewTitle(game())).toBe("Nevada vs Dayton Prediction & Preview (Nov 28)");
    expect(gamePreviewDescription(game())).toMatch(
      /^Nevada vs Dayton prediction for Saturday, November 28, 2026: Dayton has a 64% chance to win\. /,
    );
    expect(gamePreviewDescription(game({ home_win_prob: null }))).toMatch(
      /^Nevada vs Dayton prediction for Saturday, November 28, 2026: Win probabilities/,
    );
  });

  it("says where the game is played", () => {
    expect(gameSite(game())).toBe("at Dayton");
    expect(gameSite(game({ location: "Neutral" }))).toBe("on a neutral court");
  });

  it("finds the game a ?game= value names and builds its URL", () => {
    const games = [game(), game({ game_id: "2026-11-29-a-b" })];
    expect(findPreviewGame(games, "2026-11-29-a-b")?.game_id).toBe("2026-11-29-a-b");
    expect(findPreviewGame(games, ["2026-11-28-dayton-nevada"])?.home_team).toBe("Dayton");
    expect(findPreviewGame(games, "played-already")).toBeNull();
    expect(findPreviewGame(undefined, "2026-11-28-dayton-nevada")).toBeNull();
    expect(gamePreviewPath("2026-11-28-st.-john's-x")).toBe(
      "/basketball/game-preview/?game=2026-11-28-st.-john's-x",
    );
  });

  it("indexes only dated, upcoming, D1-vs-D1 games with known teams", () => {
    const today = "2026-11-28";
    const games = [
      game(),
      game({ game_id: "past", date_sort: "2026-11-27" }),
      game({ game_id: "non-d1", away_team: "Lane", away_team_conference: "" }),
      game({ game_id: "tbd", away_team: "Maui Invitational - TBD" }),
      game({ game_id: "later", date_sort: "2026-12-02" }),
    ];
    expect(indexablePreviewGames(games, today).map((g) => g.game_id)).toEqual([
      "2026-11-28-dayton-nevada",
      "later",
    ]);
    expect(indexablePreviewGames(undefined, today)).toEqual([]);
  });

  it("takes today from the Eastern clock", () => {
    // 03:00 UTC on Nov 29 is still Nov 28 in New York.
    expect(easternToday(new Date("2026-11-29T03:00:00Z"))).toBe("2026-11-28");
  });

  it("never shows a 100% or 0% chance", () => {
    expect(chanceLabel(100)).toBe(">99%");
    expect(chanceLabel(0)).toBe("<1%");
    expect(chanceLabel(64)).toBe("64%");
    expect(
      gamePreviewDescription(game({ home_win_prob: 0.997, away_win_prob: 0.003 })),
    ).toContain("Dayton has a >99% chance to win.");
  });
});
