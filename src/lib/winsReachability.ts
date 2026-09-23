/**
 * Helpers for marking win-distribution cells that are already settled:
 * totals a team has banked (they finished with at least this many wins) and
 * totals they can no longer reach.
 *
 * The distributions the API returns are truncated - outcomes that round to
 * 0% are dropped - so a blank cell on its own does not say which of the two
 * it is. A 3-0 team's regular-season distribution starts at 6, leaving 0-5
 * blank even though 0-3 are in the past and 4-5 are merely unlikely.
 */

export interface TeamGames {
  losses: number;
  distribution?: Record<string, number> | null;
}

/**
 * Number of games in the season, inferred from the distributions.
 *
 * For a team whose distribution is not truncated at the top, its largest key
 * is `wins + games left`, so `losses + largestKey` is the season length.
 * Truncation only ever pulls that estimate down, so taking the max across the
 * group makes a single untruncated team enough to get the right answer.
 *
 * Returns null when no team has a distribution to read.
 */
export function inferTotalGames(teams: TeamGames[]): number | null {
  let totalGames: number | null = null;

  for (const team of teams) {
    const keys = Object.keys(team.distribution ?? {});
    if (keys.length === 0) continue;

    const maxKey = Math.max(...keys.map(Number));
    if (!Number.isFinite(maxKey)) continue;

    const candidate = team.losses + maxKey;
    if (totalGames === null || candidate > totalGames) {
      totalGames = candidate;
    }
  }

  return totalGames;
}

export type WinOutcome = "achieved" | "impossible" | "open";

/**
 * Where a given win total sits for a team: already banked, out of reach, or
 * still live. `totalGames` of null (nothing to infer from) makes everything
 * "open" so the tables just render as they did before.
 */
export function classifyWinTotal(
  wins: number,
  { actualWins, actualLosses }: { actualWins: number; actualLosses: number },
  totalGames: number | null,
): WinOutcome {
  if (wins <= actualWins) return "achieved";
  if (totalGames !== null && wins > totalGames - actualLosses) {
    return "impossible";
  }
  return "open";
}
