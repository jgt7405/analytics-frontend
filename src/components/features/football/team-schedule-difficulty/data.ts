// Pure calculations behind the football schedule-difficulty chart: which
// games to show, the comparison distribution, percentile positions, logo
// layout, summary stats and the tooltip's figures. No React; index.tsx
// memoizes each step.

import { MARGIN, PLOT_HEIGHT } from "./constants";
import type {
  AllScheduleGame,
  ComparisonFilter,
  DifficultyStats,
  FootballTeamGame,
  GameFilter,
  GameWithPosition,
  Percentile,
  PositionedGame,
  TeamStats,
} from "./types";

/** The team's games with a win probability, filtered by result. */
export function filterTeamGames(
  schedule: FootballTeamGame[],
  allScheduleData: AllScheduleGame[] | undefined,
  gameFilter: GameFilter,
): FootballTeamGame[] {
  if (!allScheduleData) return [];

  return schedule.filter((game) => {
    if (!game.sag12_win_prob) return false;

    switch (gameFilter) {
      case "completed":
        return ["W", "L"].includes(game.status);
      case "wins":
        return game.status === "W";
      case "losses":
        return game.status === "L";
      case "remaining":
        return !["W", "L"].includes(game.status);
      default:
        return true;
    }
  });
}

/** FBS games of the chosen comparison group, filtered by result. */
export function comparisonGames(
  allScheduleData: AllScheduleGame[] | undefined,
  comparisonFilter: ComparisonFilter,
  teamConference: string | undefined,
  gameFilter: GameFilter,
): AllScheduleGame[] {
  if (!allScheduleData) return [];

  return allScheduleData.filter((game: AllScheduleGame) => {
    if (game.team_conf === "FCS") return false;

    switch (gameFilter) {
      case "completed":
        if (!["W", "L"].includes(game.status)) return false;
        break;
      case "wins":
        if (game.status !== "W") return false;
        break;
      case "losses":
        if (game.status !== "L") return false;
        break;
      case "remaining":
        if (["W", "L"].includes(game.status)) return false;
        break;
    }

    switch (comparisonFilter) {
      case "conference":
        return game.team_conf === teamConference;
      case "all_fbs":
        return game.team_conf !== "FCS";
      case "power_4":
        return game.team_conf_catg === "Power 4";
      case "non_power_4":
        return game.team_conf_catg === "Non Power 4";
      default:
        return true;
    }
  });
}

/** 0th, 10th … 90th and 100th percentile win probabilities. */
export function computePercentiles(comparisonDataset: AllScheduleGame[]): Percentile[] {
  const sag12Probs = comparisonDataset
    .map((game: AllScheduleGame) => game.sag12_win_prob)
    .sort((a: number, b: number) => a - b);

  if (sag12Probs.length === 0) return [];

  const percentileValues = [];

  percentileValues.push({ percentile: 0, value: sag12Probs[0] });

  for (let i = 10; i <= 90; i += 10) {
    const index = Math.ceil((i / 100) * sag12Probs.length) - 1;
    const value = sag12Probs[Math.max(0, index)];
    percentileValues.push({ percentile: i, value });
  }

  percentileValues.push({
    percentile: 100,
    value: sag12Probs[sag12Probs.length - 1],
  });

  return percentileValues;
}

/** Each game's percentile, interpolated between the percentile values. */
export function positionGames(
  teamGames: FootballTeamGame[],
  percentiles: Percentile[],
): GameWithPosition[] {
  // No comparison data yet (e.g. SSR before the client refetch of
  // all_schedule_data) → percentiles is empty; bail out instead of reading
  // percentiles[0].value on undefined.
  if (percentiles.length === 0) return [];

  return teamGames.map((game, index) => {
    const sag12Prob = game.sag12_win_prob!;

    let percentilePosition = 100;

    for (let i = 0; i < percentiles.length; i++) {
      if (sag12Prob <= percentiles[i].value) {
        const prevValue = i === 0 ? percentiles[0].value : percentiles[i - 1].value;
        const currValue = percentiles[i].value;
        const prevPercentile = i === 0 ? 0 : percentiles[i - 1].percentile;
        const currPercentile = percentiles[i].percentile;

        if (currValue === prevValue) {
          percentilePosition = currPercentile;
        } else {
          const ratio = (sag12Prob - prevValue) / (currValue - prevValue);
          percentilePosition = prevPercentile + ratio * (currPercentile - prevPercentile);
        }
        break;
      }
    }

    if (sag12Prob < percentiles[0].value) {
      percentilePosition = 0;
    }

    return { ...game, percentilePosition, gameIndex: index };
  });
}

/**
 * Logo positions: games alternate right and left by difficulty, and each
 * side is spread so no logos overlap, keeping each as close to its true
 * difficulty position as possible.
 */
export function layoutGames(teamGamePositions: GameWithPosition[]): PositionedGame[] {
  const sortedByDifficulty = [...teamGamePositions].sort(
    (a, b) => a.percentilePosition - b.percentilePosition,
  );

  const minSpacing = 36; // Logos are 32px tall; keep a small gap between them.
  const minY = MARGIN.top + 16;
  const maxY = MARGIN.top + PLOT_HEIGHT - 16;

  const layoutSide = (games: GameWithPosition[], isRightSide: boolean): PositionedGame[] => {
    const items = games
      .map((game) => ({
        game,
        idealY: Math.max(
          minY,
          Math.min(maxY, MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT),
        ),
      }))
      .sort((a, b) => a.idealY - b.idealY);

    const ys = items.map((it) => it.idealY);

    // Forward pass: enforce spacing moving downward.
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] - ys[i - 1] < minSpacing) ys[i] = ys[i - 1] + minSpacing;
    }

    // If the column overflowed the bottom, shift it all up.
    const overflow = ys.length ? ys[ys.length - 1] - maxY : 0;
    if (overflow > 0) {
      for (let i = 0; i < ys.length; i++) ys[i] -= overflow;
    }

    // Backward pass in case the shift pushed the top logo above the plot.
    for (let i = ys.length - 2; i >= 0; i--) {
      if (ys[i + 1] - ys[i] < minSpacing) ys[i] = ys[i + 1] - minSpacing;
    }

    // Final clamp (only bites when a side genuinely has more logos than fit).
    for (let i = 0; i < ys.length; i++) {
      ys[i] = Math.max(minY, Math.min(maxY, ys[i]));
    }

    return items.map((it, i) => ({
      ...it.game,
      isRightSide,
      adjustedY: ys[i],
    }));
  };

  const rightGames = sortedByDifficulty.filter((_, i) => i % 2 === 0);
  const leftGames = sortedByDifficulty.filter((_, i) => i % 2 === 1);

  return [...layoutSide(rightGames, true), ...layoutSide(leftGames, false)];
}

/** Record, forecast and TWV over the shown games (0-0 when only remaining games are shown). */
export function computeTeamStats(teamGames: FootballTeamGame[]): TeamStats {
  const completedGames = teamGames.filter((g) => g.status === "W" || g.status === "L");
  const isRemainingOnly =
    teamGames.length > 0 && teamGames.every((g) => g.status !== "W" && g.status !== "L");

  if (isRemainingOnly) {
    const expectedWins = teamGames.reduce((sum, g) => sum + (g.sag12_win_prob || 0), 0);
    const expectedLosses = teamGames.length - expectedWins;
    const forecastWinPct = teamGames.length > 0 ? (expectedWins / teamGames.length) * 100 : 0;
    return {
      wins: 0,
      losses: 0,
      expectedWins,
      expectedLosses,
      forecastWinPct,
      actualWinPct: 0,
      twv: 0,
    };
  }

  const wins = completedGames.filter((g) => g.status === "W").length;
  const losses = completedGames.filter((g) => g.status === "L").length;
  const expectedWins = completedGames.reduce((sum, g) => sum + (g.sag12_win_prob || 0), 0);
  const expectedLosses = completedGames.length - expectedWins;
  const forecastWinPct =
    completedGames.length > 0 ? (expectedWins / completedGames.length) * 100 : 0;
  const actualWinPct = completedGames.length > 0 ? (wins / completedGames.length) * 100 : 0;
  const twv = wins - expectedWins;

  return {
    wins,
    losses,
    expectedWins,
    expectedLosses,
    forecastWinPct,
    actualWinPct,
    twv,
  };
}

/** 1 + the number of comparison games that were harder (lower win probability; ties broken by opponent rating). */
export function gameRank(comparisonDataset: AllScheduleGame[], game: FootballTeamGame): number {
  const gameProb = game.sag12_win_prob || 0;
  const gameOppRating = game.opp_rating;

  const harderCount = comparisonDataset.filter((g) => {
    const gProb = g.sag12_win_prob || 0;
    if (gProb < gameProb) return true;
    if (gProb === gameProb && gameOppRating != null && g.opp_rating != null) {
      return g.opp_rating > gameOppRating;
    }
    return false;
  }).length;

  return harderCount + 1;
}

/** Results of comparison games within 5 points of this game's win probability. */
export function similarDifficulty(
  comparisonDataset: AllScheduleGame[],
  game: FootballTeamGame,
): DifficultyStats {
  const gamesInCategory = comparisonDataset.filter((g) => {
    const gProb = g.sag12_win_prob || 0;
    const gameProb = game.sag12_win_prob || 0;
    return Math.abs(gProb - gameProb) < 0.05;
  });

  const winsInCategory = gamesInCategory.filter((g) => g.status === "W").length;
  const lossesInCategory = gamesInCategory.filter((g) => g.status === "L").length;
  const scheduledInCategory = gamesInCategory.filter((g) => !["W", "L"].includes(g.status)).length;

  return {
    total: gamesInCategory.length,
    wins: winsInCategory,
    losses: lossesInCategory,
    scheduled: scheduledInCategory,
  };
}

/** How the comparison group reads in sentences ("all FBS", "Power 4 conferences"). */
export function filterDescription(
  comparisonFilter: ComparisonFilter,
  teamConference: string | undefined,
): string {
  switch (comparisonFilter) {
    case "conference":
      return `${teamConference} conference`;
    case "all_fbs":
      return "all FBS";
    case "power_4":
      return "Power 4 conferences";
    case "non_power_4":
      return "Non Power 4 conferences";
    default:
      return "all FBS";
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "MM/DD" → "Sep 6"; anything else → "TBD". */
export function formatGameDate(dateStr: string): string {
  if (!dateStr) return "TBD";
  const parts = dateStr.split("/");
  if (parts.length !== 2) return "TBD";
  const [month, day] = parts;
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) return "TBD";
  return `${MONTHS[m - 1]} ${d}`;
}
