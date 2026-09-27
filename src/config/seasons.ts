// Which season each sport shows, and which past seasons have archive pages.
// URL rules: docs/decisions/url-policy.md. Season rollover (the
// `season-rollover` skill) is a change to this file: move `current` to the
// front of `archived` and set the new `current`.
//
// Safe to import from client components and server code.

export type Sport = "basketball" | "football";

export const SPORT_IDS: readonly Sport[] = ["basketball", "football"];

export interface SportSeasons {
  /** Season the backend serves by default; shown at seasonless URLs. */
  current: string;
  /** Finished seasons the backend has data for, newest first. Each has
   *  archive pages at /<sport>/<season>/<page>/ and is cached as
   *  `historical` (src/lib/cache-policy.ts). Never list `current` here. */
  archived: readonly string[];
}

export const SEASONS: Record<Sport, SportSeasons> = {
  basketball: { current: "2026-27", archived: ["2025-26"] },
  football: { current: "2026-27", archived: ["2025-26"] },
};

/** Sport the site's root URL (/) sends visitors to. */
export const HOME_SPORT: Sport = "football";

/** A season as written in URLs and `?season=`: `YYYY-YY`. */
export const SEASON_FORMAT = /^\d{4}-\d{2}$/;

export function isSport(value: string | null | undefined): value is Sport {
  return value === "basketball" || value === "football";
}

export function currentSeason(sport: Sport): string {
  return SEASONS[sport].current;
}

export function archivedSeasons(sport: Sport): readonly string[] {
  return SEASONS[sport].archived;
}

export function isArchivedSeason(sport: Sport, season: string | null | undefined): boolean {
  return !!season && SEASONS[sport].archived.includes(season);
}

/**
 * Sport and (for archive pages) season of a site path.
 * `/football/2025-26/wins/` → { sport: "football", season: "2025-26" };
 * `/football/wins/` → { sport: "football", season: null }; other paths → null.
 * Any `YYYY-YY` segment counts as a season here; whether that season has
 * archive pages is `isArchivedSeason`.
 */
export function sportAndSeasonFromPath(
  pathname: string | null | undefined,
): { sport: Sport; season: string | null } | null {
  if (!pathname) return null;
  const [sport, second] = pathname.split("/").filter(Boolean);
  if (!isSport(sport)) return null;
  return { sport, season: second && SEASON_FORMAT.test(second) ? second : null };
}
