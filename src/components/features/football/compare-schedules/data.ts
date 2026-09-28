// Pure calculations behind the football compare-schedules chart. No React;
// index.tsx memoizes each step.

import { MARGIN, PLOT_HEIGHT, POWER_4_CONFERENCES } from "./constants";
import type {
  AllScheduleGame,
  ComparisonFilter,
  GameFilter,
  GameWithPosition,
  Percentile,
  PositionedGame,
  TeamGame,
  TeamSchedule,
  TeamStats,
} from "./types";

/** Every selected team's games with a win probability, filtered by result. */
export function filterTeamGames(teams: TeamSchedule[], gameFilter: GameFilter): TeamGame[] {
  return teams.flatMap((team, teamIndex) =>
    team.games
      .filter((game) => {
        if (!game.winProb) return false;

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
        teamConfCategory: team.teamConfCategory,
      })),
  );
}

/**
 * Games the percentiles are built from: "Teams Selected" uses the selected
 * teams' shown games; the other groups filter every selected team's
 * league-wide schedule data (FCS excluded).
 */
export function comparisonGames(
  teams: TeamSchedule[],
  teamGames: TeamGame[],
  comparisonFilter: ComparisonFilter,
  gameFilter: GameFilter,
): AllScheduleGame[] {
  if (comparisonFilter === "teams_selected") {
    return teamGames.map((game) => ({
      team: teams[game.teamIndex].teamName,
      opponent: game.opponent,
      opponentColor: game.opponentColor,
      winProb: game.winProb,
      teamConference: game.teamConference,
      teamConfCategory: game.teamConfCategory,
      status: game.status,
    }));
  }

  const allScheduleDataCombined: AllScheduleGame[] = teams.flatMap((team) => team.allScheduleData);

  return allScheduleDataCombined.filter((game: AllScheduleGame) => {
    if (game.teamConference === "FCS") return false;

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
      case "all_fbs":
        return true;
      case "power_4":
        return game.teamConfCategory === "Power 4" || POWER_4_CONFERENCES.includes(game.teamConference);
      case "non_power_4":
        return game.teamConfCategory === "Non Power 4" || !POWER_4_CONFERENCES.includes(game.teamConference);
      default:
        return true;
    }
  });
}

/** 0th, 10th … 90th and 100th percentile win probabilities. */
export function computePercentiles(comparisonDataset: AllScheduleGame[]): Percentile[] {
  if (!comparisonDataset || comparisonDataset.length === 0) return [];

  const allWinProbs = comparisonDataset.map((game: AllScheduleGame) => game.winProb).sort((a, b) => a - b);

  const percentileValues = [];

  percentileValues.push({ percentile: 0, value: allWinProbs[0] });

  for (let i = 10; i <= 90; i += 10) {
    const index = Math.ceil((i / 100) * allWinProbs.length) - 1;
    const value = allWinProbs[Math.max(0, index)];
    percentileValues.push({ percentile: i, value });
  }

  percentileValues.push({
    percentile: 100,
    value: allWinProbs[allWinProbs.length - 1],
  });

  return percentileValues;
}

/** A win probability's percentile, interpolated (50 with no data). */
export function percentilePosition(winProb: number, percentiles: Percentile[]): number {
  if (!percentiles || percentiles.length === 0) return 50;

  let position = 100;

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

/** Per-team record, forecast and TWV over the shown games (0-0 when only remaining games are shown). */
export function computeTeamStats(
  teams: TeamSchedule[],
  teamGames: TeamGame[],
): { [teamIndex: number]: TeamStats } {
  const stats: { [teamIndex: number]: TeamStats } = {};

  teams.forEach((_team, teamIndex) => {
    const teamGamesList = teamGames.filter((g) => g.teamIndex === teamIndex);

    const isRemainingOnly =
      teamGamesList.length > 0 && teamGamesList.every((g) => g.status !== "W" && g.status !== "L");

    if (isRemainingOnly) {
      const expectedWins = teamGamesList.reduce((sum, g) => sum + g.winProb, 0);
      const expectedLosses = teamGamesList.length - expectedWins;
      const forecastWinPct = teamGamesList.length > 0 ? (expectedWins / teamGamesList.length) * 100 : 0;

      stats[teamIndex] = {
        wins: 0,
        losses: 0,
        expectedWins,
        expectedLosses,
        forecastWinPct,
        actualWinPct: 0,
        twv: 0,
      };
    } else {
      const completedGames = teamGamesList.filter((g) => g.status === "W" || g.status === "L");

      const wins = completedGames.filter((g) => g.status === "W").length;
      const losses = completedGames.filter((g) => g.status === "L").length;
      const expectedWins = completedGames.reduce((sum, g) => sum + g.winProb, 0);
      const expectedLosses = completedGames.length - expectedWins;
      const forecastWinPct = completedGames.length > 0 ? (expectedWins / completedGames.length) * 100 : 0;
      const actualWinPct = completedGames.length > 0 ? (wins / completedGames.length) * 100 : 0;
      const twv = wins - expectedWins;

      stats[teamIndex] = {
        wins,
        losses,
        expectedWins,
        expectedLosses,
        forecastWinPct,
        actualWinPct,
        twv,
      };
    }
  });

  return stats;
}

/**
 * Logo positions: each team's games (one column, logos on the left) cascade
 * at least 32px apart from the hardest down, and a column that overflows the
 * bottom is compressed proportionally. (Clamping each logo on its own
 * collapsed every overflowing logo onto the same pixel.)
 */
export function layoutGames(allGamesWithPosition: GameWithPosition[]): PositionedGame[] {
  const minSpacing = 32;
  const positioned: PositionedGame[] = [];

  const gamesByTeam = new Map<number, GameWithPosition[]>();
  allGamesWithPosition.forEach((game) => {
    if (!gamesByTeam.has(game.teamIndex)) {
      gamesByTeam.set(game.teamIndex, []);
    }
    gamesByTeam.get(game.teamIndex)!.push(game);
  });

  const topBound = MARGIN.top + 15;
  const bottomBound = MARGIN.top + PLOT_HEIGHT - 15;

  gamesByTeam.forEach((teamGamesList) => {
    const sorted = [...teamGamesList].sort((a, b) => a.percentilePosition - b.percentilePosition);

    const adjustedYs: number[] = [];
    sorted.forEach((game, i) => {
      const gameY = MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
      adjustedYs.push(i === 0 ? Math.max(topBound, gameY) : Math.max(gameY, adjustedYs[i - 1] + minSpacing));
    });

    const overflow = adjustedYs[adjustedYs.length - 1] - bottomBound;
    if (overflow > 0 && adjustedYs.length > 1) {
      const span = adjustedYs[adjustedYs.length - 1] - adjustedYs[0];
      const availableSpan = bottomBound - adjustedYs[0];
      const scale = span > 0 ? availableSpan / span : 1;
      for (let i = 1; i < adjustedYs.length; i++) {
        adjustedYs[i] = adjustedYs[0] + (adjustedYs[i] - adjustedYs[0]) * scale;
      }
    }

    sorted.forEach((game, i) => {
      positioned.push({
        ...game,
        adjustedY: adjustedYs[i],
      });
    });
  });

  return positioned;
}

/** Number of comparison games at least as hard as this one, for the tooltip. */
export function difficultyRank(comparisonDataset: AllScheduleGame[], winProb: number): number {
  return comparisonDataset.filter((g: AllScheduleGame) => g.winProb <= winProb).length;
}
