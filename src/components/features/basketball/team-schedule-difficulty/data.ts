// Pure calculations behind the schedule-difficulty chart: which games to
// show, the comparison distribution, percentile positions, logo layout and
// the summary stats. No React; index.tsx memoizes each step.

import { POWER_CONFERENCES, THRESHOLD, TOP_MARGIN, TOP_PLOT_HEIGHT } from "./constants";
import type {
  AllScheduleGame,
  BasketballTeamGame,
  ComparisonFilter,
  GameFilter,
  GameWithPosition,
  HighProbRecord,
  LocationFilter,
  Percentile,
  PositionedGame,
  TeamStats,
} from "./types";

/** The team's games with a win probability, filtered by result and location. */
export function filterTeamGames(
  schedule: BasketballTeamGame[],
  allScheduleData: AllScheduleGame[] | undefined,
  gameFilter: GameFilter,
  locationFilter: LocationFilter,
): BasketballTeamGame[] {
  if (!allScheduleData) return [];

  return schedule.filter((game) => {
    if (!game.rk50_win_prob) return false;

    // Filter by location
    if (locationFilter !== "all") {
      const gameLocation = game.location || "";
      if (locationFilter === "home" && gameLocation !== "Home") return false;
      if (locationFilter === "away" && gameLocation !== "Away") return false;
      if (locationFilter === "neutral" && gameLocation !== "Neutral") return false;
    }

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

/** Games at or below the 95% threshold (charted) and above it (summarized). */
export function splitByThreshold(teamGames: BasketballTeamGame[]): {
  lowProbGames: BasketballTeamGame[];
  highProbGames: BasketballTeamGame[];
} {
  const low = teamGames.filter((g) => (g.rk50_win_prob || 0) <= THRESHOLD);
  const high = teamGames.filter((g) => (g.rk50_win_prob || 0) > THRESHOLD);
  return { lowProbGames: low, highProbGames: high };
}

/**
 * The percentile distribution is built from ALL teams in the selected
 * category (e.g. all Power 5 teams' games), not just the selected team's
 * games. Only games at or below the threshold count.
 */
export function comparisonGames(
  allScheduleData: AllScheduleGame[] | undefined,
  comparisonFilter: ComparisonFilter,
  teamConference: string | undefined,
  gameFilter: GameFilter,
): AllScheduleGame[] {
  if (!allScheduleData) return [];

  return allScheduleData.filter((game: AllScheduleGame) => {
    // Only include games <= 95%
    if ((game.rk50_win_prob || 0) > THRESHOLD) return false;

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
      case "all_d1":
        return true;
      case "power_6":
        // Use team_conf_catg if available, otherwise fall back to conference names
        if (game.team_conf_catg) {
          return game.team_conf_catg === "Power";
        }
        return POWER_CONFERENCES.includes(game.team_conf);
      case "non_power_6":
        if (game.team_conf_catg) {
          return game.team_conf_catg !== "Power";
        }
        return !POWER_CONFERENCES.includes(game.team_conf);
      default:
        return true;
    }
  });
}

/** 0th, 10th … 90th and 100th percentile win probabilities (100th capped at the threshold). */
export function computePercentiles(comparisonDataset: AllScheduleGame[]): Percentile[] {
  const kenpomProbs = comparisonDataset
    .map((game: AllScheduleGame) => game.rk50_win_prob)
    .sort((a: number, b: number) => a - b);

  if (kenpomProbs.length === 0) return [];

  const percentileValues = [];
  percentileValues.push({ percentile: 0, value: kenpomProbs[0] });

  for (let i = 10; i <= 90; i += 10) {
    const index = Math.ceil((i / 100) * kenpomProbs.length) - 1;
    const value = kenpomProbs[Math.max(0, index)];
    percentileValues.push({ percentile: i, value });
  }

  percentileValues.push({
    percentile: 100,
    value: Math.min(kenpomProbs[kenpomProbs.length - 1], THRESHOLD),
  });

  return percentileValues;
}

/** Each charted game's percentile, interpolated between the percentile values. */
export function positionGames(
  lowProbGames: BasketballTeamGame[],
  percentiles: Percentile[],
): GameWithPosition[] {
  if (percentiles.length === 0) return [];

  return lowProbGames.map((game, index) => {
    const kenpomProb = game.rk50_win_prob!;
    let percentilePosition = 100;

    for (let i = 0; i < percentiles.length; i++) {
      if (kenpomProb <= percentiles[i].value) {
        const prevValue = i === 0 ? percentiles[0].value : percentiles[i - 1].value;
        const currValue = percentiles[i].value;
        const prevPercentile = i === 0 ? 0 : percentiles[i - 1].percentile;
        const currPercentile = percentiles[i].percentile;

        if (currValue === prevValue) {
          percentilePosition = currPercentile;
        } else {
          const ratio = (kenpomProb - prevValue) / (currValue - prevValue);
          percentilePosition = prevPercentile + ratio * (currPercentile - prevPercentile);
        }
        break;
      }
    }

    if (kenpomProb < percentiles[0].value) {
      percentilePosition = 0;
    }

    return {
      ...game,
      percentilePosition,
      gameIndex: index,
      isHighProb: false,
    };
  });
}

/**
 * Logo positions: games are dealt into four columns by difficulty, and each
 * column is spread so no logos overlap, keeping each as close to its true
 * difficulty position as possible.
 */
export function layoutGames(teamGamePositions: GameWithPosition[]): PositionedGame[] {
  const sortedByDifficulty = [...teamGamePositions].sort(
    (a, b) => a.percentilePosition - b.percentilePosition,
  );

  const minSpacing = 28; // Logos are 24px tall; keep a small gap between them.
  const minY = TOP_MARGIN.top + 15;
  const maxY = TOP_MARGIN.top + TOP_PLOT_HEIGHT - 15;
  const columnPattern = [0, 3, 1, 2];

  const withColumn = sortedByDifficulty.map((game, index) => ({
    game,
    columnIndex: columnPattern[index % 4],
  }));

  const layoutColumn = (
    entries: { game: GameWithPosition; columnIndex: number }[],
  ): PositionedGame[] => {
    const items = entries
      .map(({ game, columnIndex }) => ({
        game,
        columnIndex,
        idealY: Math.max(
          minY,
          Math.min(maxY, TOP_MARGIN.top + (game.percentilePosition / 100) * TOP_PLOT_HEIGHT),
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

    // Final clamp (only bites when a column genuinely has more logos than fit).
    for (let i = 0; i < ys.length; i++) {
      ys[i] = Math.max(minY, Math.min(maxY, ys[i]));
    }

    return items.map((it, i) => ({
      ...it.game,
      isRightSide: it.columnIndex >= 2,
      adjustedY: ys[i],
      columnIndex: it.columnIndex,
    }));
  };

  return [0, 1, 2, 3].flatMap((col) =>
    layoutColumn(withColumn.filter((e) => e.columnIndex === col)),
  );
}

/** Wins, losses and games left among the >95% games. */
export function highProbabilityRecord(highProbGames: BasketballTeamGame[]): HighProbRecord {
  let wins = 0,
    losses = 0,
    remaining = 0;

  highProbGames.forEach((game) => {
    if (game.status === "W") wins++;
    else if (game.status === "L") losses++;
    else remaining++;
  });

  return { wins, losses, remaining };
}

/** Summary stats over all shown games (both <95% and >95%). */
export function computeTeamStats(
  lowProbGames: BasketballTeamGame[],
  highProbGames: BasketballTeamGame[],
  highProbRecord: HighProbRecord,
): TeamStats {
  const allTeamGames = [...lowProbGames, ...highProbGames];
  const completedGames = allTeamGames.filter((g) => g.status === "W" || g.status === "L");

  // Check if showing remaining games only
  const isRemainingOnly =
    allTeamGames.length > 0 && allTeamGames.every((g) => g.status !== "W" && g.status !== "L");

  if (isRemainingOnly) {
    // For remaining games: show 0-0 record, expected wins from remaining games, TWV = 0
    const expectedWinsLow = lowProbGames.reduce((sum, g) => sum + (g.rk50_win_prob || 0), 0);
    const totalGamesLow = lowProbGames.length;
    const expectedLossesLow = totalGamesLow - expectedWinsLow;

    // Include high prob games in totals
    const expectedWinsHigh = highProbGames.reduce((sum, g) => sum + (g.rk50_win_prob || 0), 0);
    const totalGamesHigh = highProbGames.length;
    const expectedLossesHigh = totalGamesHigh - expectedWinsHigh;

    const totalExpectedWins = expectedWinsLow + expectedWinsHigh;
    const totalExpectedLosses = expectedLossesLow + expectedLossesHigh;
    const totalGames = totalGamesLow + totalGamesHigh;

    const forecastWinPct = totalGames > 0 ? (totalExpectedWins / totalGames) * 100 : 0;

    return {
      wins: 0,
      losses: 0,
      expectedWins: totalExpectedWins,
      expectedLosses: totalExpectedLosses,
      forecastWinPct,
      twv_50: 0,
      actualWinPct: 0,
      highProbWins: highProbRecord.wins,
      highProbLosses: highProbRecord.losses,
      highProbGames: highProbGames.length,
    };
  }

  // For completed games: normal calculation including >95% games
  const wins = completedGames.filter((g) => g.status === "W").length;
  const losses = completedGames.filter((g) => g.status === "L").length;

  // Expected wins: sum of all win probabilities (both low and high prob)
  const expectedWins = completedGames.reduce((sum, g) => sum + (g.rk50_win_prob || 0), 0);
  const expectedLosses = completedGames.length - expectedWins;

  const forecastWinPct =
    completedGames.length > 0 ? (expectedWins / completedGames.length) * 100 : 0;

  // True Win Value
  const twv_50 = wins - expectedWins;

  const actualWinPct = completedGames.length > 0 ? (wins / completedGames.length) * 100 : 0;

  return {
    wins,
    losses,
    expectedWins,
    expectedLosses,
    forecastWinPct,
    twv_50,
    actualWinPct,
    highProbWins: highProbRecord.wins,
    highProbLosses: highProbRecord.losses,
    highProbGames: highProbGames.length,
  };
}

/** Rank of a win probability among the comparison games (1 = hardest), for the tooltip. */
export function difficultyRank(comparisonDataset: AllScheduleGame[], winProb: number): number {
  const allGamesInFilter = comparisonDataset.map((g) => g.rk50_win_prob).sort((a, b) => a - b);
  const position = allGamesInFilter.findIndex((prob) => prob >= winProb);
  return position === -1 ? allGamesInFilter.length : position + 1;
}
