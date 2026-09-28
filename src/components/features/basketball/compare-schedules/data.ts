// Pure calculations behind the compare-schedules chart. No React; index.tsx
// memoizes each step.

import { MARGIN, PLOT_HEIGHT, POWER_CONFERENCES, THRESHOLD } from "./constants";
import type {
  AllScheduleGame,
  ComparisonFilter,
  GameFilter,
  GameWithPosition,
  LocationFilter,
  Percentile,
  PositionedGame,
  TeamGame,
  TeamSchedule,
  TeamStats,
} from "./types";

/** Every selected team's games with a win probability, filtered by result and location. */
export function filterTeamGames(
  teams: TeamSchedule[],
  gameFilter: GameFilter,
  locationFilter: LocationFilter,
): TeamGame[] {
  return teams.flatMap((team, teamIndex) =>
    team.games
      .filter((game) => {
        if (!game.winProb) return false;

        // Filter by location - match against full location names
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
      })
      .map((game, gameIndex) => ({
        teamIndex,
        gameIndex,
        opponent: game.opponent,
        opponentLogo: game.opponentLogo,
        opponentColor: game.opponentColor,
        winProb: game.winProb,
        status: game.status,
        location: game.location,
        teamConference: team.teamConference,
        isHighProb: game.winProb > THRESHOLD,
      })),
  );
}

/**
 * Games (<= 95%) the percentiles are built from. "Teams Selected" uses the
 * selected teams' shown games; the other groups filter the FIRST selected
 * team's league-wide schedule data.
 */
export function comparisonGames(
  teams: TeamSchedule[],
  teamGames: TeamGame[],
  comparisonFilter: ComparisonFilter,
  gameFilter: GameFilter,
): AllScheduleGame[] {
  if (comparisonFilter === "teams_selected") {
    return teamGames
      .filter((game) => game.winProb <= THRESHOLD)
      .map((game) => ({
        team: teams[game.teamIndex].teamName,
        opponent: game.opponent,
        opponentColor: game.opponentColor,
        winProb: game.winProb,
        teamConference: teams[game.teamIndex].teamConference,
        status: game.status,
      }));
  }

  const firstTeamScheduleData: AllScheduleGame[] = teams.length === 0 ? [] : teams[0].allScheduleData;

  return firstTeamScheduleData.filter((game: AllScheduleGame) => {
    // Only include games <= 95%
    if (game.winProb > THRESHOLD) return false;

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

    switch (comparisonFilter as ComparisonFilter) {
      case "all_d1":
        return true;
      case "power_6":
        // Use team_conf_catg if available, otherwise fall back to conference names
        if (game.teamConfCategory) {
          return game.teamConfCategory === "Power";
        }
        return POWER_CONFERENCES.includes(game.teamConference);
      case "non_power_6":
        if (game.teamConfCategory) {
          return game.teamConfCategory !== "Power";
        }
        return !POWER_CONFERENCES.includes(game.teamConference);
      default:
        return true;
    }
  });
}

/** 0th, 10th … 90th and 100th percentile win probabilities (100th capped at the threshold). */
export function computePercentiles(comparisonDataset: AllScheduleGame[]): Percentile[] {
  const kenpomProbs = comparisonDataset
    .map((game: AllScheduleGame) => game.winProb)
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

/** A win probability's percentile, interpolated (50 with no data; 100 at or past the top). */
export function percentilePosition(winProb: number, percentiles: Percentile[]): number {
  if (percentiles.length === 0) return 50;
  if (winProb >= percentiles[percentiles.length - 1].value) return 100;

  let position = 0;

  for (let i = 0; i < percentiles.length; i++) {
    if (winProb <= percentiles[i].value) {
      const prevValue = i === 0 ? percentiles[0].value : percentiles[i - 1].value;
      const currValue = percentiles[i].value;
      const prevPercentile = i === 0 ? 0 : percentiles[i - 1].percentile;
      const currPercentile = percentiles[i].percentile;

      if (currValue === prevValue) {
        position = currPercentile;
      } else {
        const ratio = (winProb - prevValue) / (currValue - prevValue);
        position = prevPercentile + ratio * (currPercentile - prevPercentile);
      }
      break;
    }
  }

  if (winProb < percentiles[0].value) {
    position = 0;
  }

  return position;
}

/** Win probability shown on the right axis at a gridline's percentile. */
export function winProbAtPercentile(percentile: number, percentiles: Percentile[]): number {
  let winProbValue = 0;
  if (percentiles.length > 0) {
    const percentileData = percentiles.find((p) => p.percentile === percentile);
    if (percentileData) {
      winProbValue = percentileData.value;
    } else {
      // Interpolate between percentiles
      for (let i = 0; i < percentiles.length - 1; i++) {
        if (percentile >= percentiles[i].percentile && percentile <= percentiles[i + 1].percentile) {
          const ratio =
            (percentile - percentiles[i].percentile) /
            (percentiles[i + 1].percentile - percentiles[i].percentile);
          winProbValue = percentiles[i].value + ratio * (percentiles[i + 1].value - percentiles[i].value);
          break;
        }
      }
    }
  }
  return winProbValue;
}

/** Per-team record, forecast and TWV over all shown games, >95% games included. */
export function computeTeamStats(
  teams: TeamSchedule[],
  teamGames: TeamGame[],
): { [teamIndex: number]: TeamStats } {
  const stats: { [teamIndex: number]: TeamStats } = {};

  teams.forEach((_team, teamIndex) => {
    const teamGamesList = teamGames.filter((g) => g.teamIndex === teamIndex);
    const teamHighProbGames = teamGamesList.filter((g) => g.isHighProb);
    const teamLowProbGames = teamGamesList.filter((g) => !g.isHighProb);

    // Check if showing remaining games only
    const isRemainingOnly =
      teamGamesList.length > 0 && teamGamesList.every((g) => g.status !== "W" && g.status !== "L");

    if (isRemainingOnly) {
      // For remaining games: show 0-0 record, expected wins from remaining games, TWV = 0
      const expectedWinsLow = teamLowProbGames.reduce((sum, g) => sum + g.winProb, 0);
      const totalGamesLow = teamLowProbGames.length;
      const expectedLossesLow = totalGamesLow - expectedWinsLow;

      // Include high prob games in totals
      const expectedWinsHigh = teamHighProbGames.reduce((sum, g) => sum + g.winProb, 0);
      const totalGamesHigh = teamHighProbGames.length;
      const expectedLossesHigh = totalGamesHigh - expectedWinsHigh;

      const totalExpectedWins = expectedWinsLow + expectedWinsHigh;
      const totalExpectedLosses = expectedLossesLow + expectedLossesHigh;
      const totalGames = totalGamesLow + totalGamesHigh;

      const forecastWinPct = totalGames > 0 ? (totalExpectedWins / totalGames) * 100 : 0;

      stats[teamIndex] = {
        wins: 0,
        losses: 0,
        expectedWins: totalExpectedWins,
        expectedLosses: totalExpectedLosses,
        forecastWinPct,
        twv_50: 0,
        actualWinPct: 0,
        highProbWins: 0,
        highProbLosses: 0,
        highProbGames: teamHighProbGames.length,
      };
    } else {
      // For completed games: normal calculation including >95% games
      const completedLowProbGames = teamLowProbGames.filter((g) => g.status === "W" || g.status === "L");
      const completedHighProbGames = teamHighProbGames.filter((g) => g.status === "W" || g.status === "L");

      const winsLow = completedLowProbGames.filter((g) => g.status === "W").length;
      const lossesLow = completedLowProbGames.filter((g) => g.status === "L").length;
      const winsHigh = completedHighProbGames.filter((g) => g.status === "W").length;
      const lossesHigh = completedHighProbGames.filter((g) => g.status === "L").length;

      const wins = winsLow + winsHigh;
      const losses = lossesLow + lossesHigh;
      const totalGames = completedLowProbGames.length + completedHighProbGames.length;

      // Forecast: sum of all win probabilities (both low and high prob)
      const expectedWinsLow = completedLowProbGames.reduce((sum, g) => sum + g.winProb, 0);
      const expectedWinsHigh = completedHighProbGames.reduce((sum, g) => sum + g.winProb, 0);
      const expectedWins = expectedWinsLow + expectedWinsHigh;
      const expectedLosses = totalGames - expectedWins;

      const forecastWinPct = totalGames > 0 ? (expectedWins / totalGames) * 100 : 0;
      // TWV: actual wins - expected wins
      const twv_50 = wins - expectedWins;
      const actualWinPct = totalGames > 0 ? (wins / totalGames) * 100 : 0;

      stats[teamIndex] = {
        wins,
        losses,
        expectedWins,
        expectedLosses,
        forecastWinPct,
        twv_50,
        actualWinPct,
        highProbWins: winsHigh,
        highProbLosses: lossesHigh,
        highProbGames: teamHighProbGames.length,
      };
    }
  });

  return stats;
}

/**
 * Logo positions: in each team's column, games alternate left and right by
 * difficulty, then each side is cascaded so no logos overlap and compressed
 * proportionally if it overflows the bottom. (Clamping each logo on its own
 * collapsed every overflowing logo onto the same pixel.)
 */
export function layoutGames(gamesWithPercentiles: GameWithPosition[], teamCount: number): PositionedGame[] {
  const positioned: PositionedGame[] = [];
  const minSpacing = 22; // Minimum pixels between logos (18px logo + 4px buffer)
  const topBound = MARGIN.top + 12;
  const bottomBound = MARGIN.top + PLOT_HEIGHT - 12;

  const spreadColumn = <T extends { idealY: number }>(entries: T[]) => {
    const sorted = [...entries].sort((a, b) => a.idealY - b.idealY);
    const ys: number[] = [];
    sorted.forEach((entry, i) => {
      ys.push(i === 0 ? Math.max(topBound, entry.idealY) : Math.max(entry.idealY, ys[i - 1] + minSpacing));
    });

    const overflow = ys.length ? ys[ys.length - 1] - bottomBound : 0;
    if (overflow > 0 && ys.length > 1) {
      const span = ys[ys.length - 1] - ys[0];
      const availableSpan = bottomBound - ys[0];
      const scale = span > 0 ? availableSpan / span : 1;
      for (let i = 1; i < ys.length; i++) {
        ys[i] = ys[0] + (ys[i] - ys[0]) * scale;
      }
    }

    return sorted.map((entry, i) => ({ entry, y: ys[i] }));
  };

  for (let teamIndex = 0; teamIndex < teamCount; teamIndex++) {
    const columnGames = gamesWithPercentiles
      .filter((g) => g.teamIndex === teamIndex)
      .sort((a, b) => a.percentilePosition - b.percentilePosition); // hardest first

    if (columnGames.length === 0) continue;

    const entries = columnGames.map((game, index) => ({
      game,
      isRightSide: index % 2 === 1,
      idealY: MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT,
    }));

    [false, true].forEach((side) => {
      spreadColumn(entries.filter((e) => e.isRightSide === side)).forEach(({ entry, y }) => {
        positioned.push({
          ...entry.game,
          adjustedY: y,
          isRightSide: entry.isRightSide,
        });
      });
    });
  }

  return positioned;
}

/** Number of comparison games at least as hard as this one, for the tooltip. */
export function difficultyRank(comparisonDataset: AllScheduleGame[], winProb: number): number {
  return comparisonDataset.filter((g) => g.winProb <= winProb).length;
}
