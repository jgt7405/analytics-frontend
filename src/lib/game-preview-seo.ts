// Search wording for the basketball game preview. Each ?game= URL is its own
// page (own title, description, canonical and heading), the way people search
// for a game: "nevada vs dayton prediction", "winthrop basketball preview".
// Used by the page, its server-rendered summary and the sitemap.

import type { UpcomingGame } from "@/types/gamePreview";

export const GAME_PREVIEW_PATH = "/basketball/game-preview/";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** URL of one game's preview. */
export function gamePreviewPath(gameId: string): string {
  return `${GAME_PREVIEW_PATH}?game=${encodeURIComponent(gameId)}`;
}

/** Today's date ("2026-11-28") in US Eastern time, the schedule's clock. */
export function easternToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * The games that get their own search page: dated today or later, both teams
 * Division I (a non-D1 opponent has no conference and no team page) and
 * known (bracket placeholders like "Maui Invitational - TBD" are not). The
 * picker still offers every game; the rest just aren't indexed.
 */
export function indexablePreviewGames(
  games: UpcomingGame[] | undefined,
  today: string = easternToday(),
): UpcomingGame[] {
  return (games ?? []).filter(
    (g) =>
      g.date_sort >= today &&
      Boolean(g.home_team_conference) &&
      Boolean(g.away_team_conference) &&
      !/\bTBD\b/.test(`${g.home_team} ${g.away_team}`),
  );
}

/** A chance to win as shown: whole percents, but never "100%" or "0%". */
export function chanceLabel(pct: number): string {
  if (pct >= 100) return ">99%";
  if (pct <= 0) return "<1%";
  return `${pct}%`;
}

/** The game a ?game= value names, or null. */
export function findPreviewGame(
  games: UpcomingGame[] | undefined,
  raw: string | string[] | null | undefined,
): UpcomingGame | null {
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || !games) return null;
  return games.find((g) => g.game_id === id) ?? null;
}

/** "2026-11-28" -> short "Nov 28", long "Saturday, November 28, 2026".
 *  Parsed by hand (UTC) so the server's time zone can't shift the day. */
export function gameDate(dateSort: string): { short: string; long: string } | null {
  const match = dateSort.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const monthName = MONTHS[month - 1];
  return {
    short: `${monthName.slice(0, 3)} ${day}`,
    long: `${weekday}, ${monthName} ${day}, ${year}`,
  };
}

/** "Nevada vs Dayton" */
export function matchupName(game: UpcomingGame): string {
  return `${game.away_team} vs ${game.home_team}`;
}

/** Favorite and their chance to win (whole percent), or null without
 *  probabilities. An exact 50-50 game has no favorite. */
export function gameFavorite(
  game: UpcomingGame,
): { team: string; opponent: string; pct: number; opponentPct: number } | null {
  const home = game.home_win_prob;
  const away = game.away_win_prob;
  if (home == null || away == null) return null;
  const homePct = Math.round(home * 100);
  const awayPct = Math.round(away * 100);
  if (homePct === awayPct) return null;
  return homePct > awayPct
    ? { team: game.home_team, opponent: game.away_team, pct: homePct, opponentPct: awayPct }
    : { team: game.away_team, opponent: game.home_team, pct: awayPct, opponentPct: homePct };
}

/** "at Dayton" or "on a neutral court". */
export function gameSite(game: UpcomingGame): string {
  return game.location === "Neutral" ? "on a neutral court" : `at ${game.home_team}`;
}

/** Page title (the site name is appended by the root template). */
export function gamePreviewTitle(game: UpcomingGame): string {
  const date = gameDate(game.date_sort);
  return `${matchupName(game)} Prediction & Preview${date ? ` (${date.short})` : ""}`;
}

export function gamePreviewDescription(game: UpcomingGame): string {
  const date = gameDate(game.date_sort);
  const favorite = gameFavorite(game);
  const when = date ? ` for ${date.long}` : "";
  const pick = favorite
    ? ` ${favorite.team} has a ${chanceLabel(favorite.pct)} chance to win.`
    : "";
  return `${matchupName(game)} prediction${when}:${pick} Win probabilities, a head-to-head comparison of ratings and records, what a win or loss does to each team's NCAA tournament odds, and both schedules.`;
}
