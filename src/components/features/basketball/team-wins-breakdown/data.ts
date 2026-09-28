// Pure calculations behind the wins-to-seed chart. No React; index.tsx
// memoizes them.

import {
  BAR_WIDTH,
  CHART_HEIGHT,
  CHART_SHIFT,
  LOGO_SIZE,
  LOGO_SPACING,
  MIN_WIDTH,
  PADDING,
} from "./constants";
import type {
  BasketballTeamGame,
  ChartGame,
  ChartLayout,
  ConfChampData,
  LogoPosition,
  SeedThresholds,
} from "./types";

/** Conference logo path: spaces and hyphens become underscores. */
export function confLogoPath(conference: string): string {
  const formattedConfName = conference.replace(/\s+/g, "_").replace(/-/g, "_");
  return `/images/conf_logos/${formattedConfName}.png`;
}

/** Secondary color for bar separators, with a contrast fallback when the team has none. */
export function barSecondaryColor(primaryColor: string, secondaryColor?: string): string {
  return secondaryColor
    ? secondaryColor
    : primaryColor === "#3b82f6"
      ? "#ef4444"
      : primaryColor === "#10b981"
        ? "#3b82f6"
        : "#ef4444";
}

/** Projected conference-tournament games (1-6) the team has a chance to play. */
export function confTourneyGames(
  confChampData: ConfChampData | null,
  confLogoUrl: string,
): ChartGame[] {
  if (!confChampData) {
    return [];
  }

  const games: ChartGame[] = [];

  for (let gameNum = 1; gameNum <= 6; gameNum++) {
    const probKey = `pct_prob_win_conf_tourney_game_${gameNum}` as keyof ConfChampData;
    const prob = (confChampData[probKey] as number) || 0;

    if (prob > 0) {
      games.push({
        date: "",
        opponent: `Conf Tourney Game ${gameNum}`,
        opponent_logo: confLogoUrl,
        opponent_primary_color: "#8B7355",
        location: "Neutral",
        status: "Projected",
        team_win_prob: prob / 100,
        winProb: prob / 100,
      });
    }
  }

  return games;
}

/** Wins so far and games left (plus projected tournament games), each most likely first. */
export function splitGames(
  schedule: BasketballTeamGame[],
  confChampGames: ChartGame[],
): { completedWins: ChartGame[]; remainingGames: ChartGame[]; totalWins: number } {
  const wins = schedule
    .filter((g) => g.status === "W" && g.team_win_prob !== undefined)
    .map((g) => ({
      ...g,
      winProb: g.team_win_prob || 0,
    }))
    .sort((a, b) => b.winProb - a.winProb);

  const remaining = schedule
    .filter((g) => !["W", "L"].includes(g.status) && g.team_win_prob !== undefined)
    .map((g) => ({
      ...g,
      winProb: g.team_win_prob || 0,
    }))
    .concat(confChampGames)
    .sort((a, b) => b.winProb - a.winProb);

  return {
    completedWins: wins,
    remainingGames: remaining,
    totalWins: wins.length,
  };
}

/** The chart's geometry: one bar slot per game (wins, then games left). */
export function computeLayout(isMobile: boolean, totalWins: number, maxGames: number): ChartLayout {
  const chartWidth = isMobile ? Math.max(MIN_WIDTH, 300) : Math.max(MIN_WIDTH, 320);
  const chartHeight = CHART_HEIGHT;

  const chartAreaTop = PADDING;
  const chartAreaBottom = chartHeight - PADDING - 20;
  const chartAreaHeight = chartAreaBottom - chartAreaTop;

  const centerX = chartWidth / 2 - 50 + CHART_SHIFT;
  const barX = centerX - BAR_WIDTH / 2;
  const barWidth = BAR_WIDTH;

  const barBottomY = chartAreaBottom;
  const barTopY = barBottomY - (totalWins / maxGames) * chartAreaHeight;

  return {
    isMobile,
    chartWidth,
    chartHeight,
    maxGames,
    chartAreaTop,
    chartAreaBottom,
    chartAreaHeight,
    barX,
    barWidth,
    barBottomY,
    barTopY,
    regionRight: isMobile ? chartWidth - PADDING - 110 : chartWidth - PADDING - 65,
    getYFromWins: (wins: number) => {
      if (maxGames === 0) return chartAreaBottom;
      return chartAreaBottom - (wins / maxGames) * chartAreaHeight;
    },
  };
}

/** Where each game's logo row sits, in bar order. */
export function logoPositions(allGames: ChartGame[], layout: ChartLayout): LogoPosition[] {
  return allGames.map((game, index) => {
    const gameCenterNumber = index + 0.5;
    const yPosition =
      layout.barBottomY - (gameCenterNumber / layout.maxGames) * layout.chartAreaHeight;

    const logoX = layout.barX - LOGO_SPACING - LOGO_SIZE;

    return { game, yPosition, gameNumber: index + 1, logoX };
  });
}

export function seedThresholds(confChampData: ConfChampData): SeedThresholds {
  return {
    bubbleWins: confChampData.wins_for_bubble || 0,
    seed10Wins: confChampData.wins_for_10_seed || 0,
    seed7Wins: confChampData.wins_for_7_seed || 0,
    seed4Wins: confChampData.wins_for_4_seed || 0,
    seed1Wins: confChampData.wins_for_1_seed || 0,
  };
}

/** Win-probability cell: yellow (0%) → white (50%) → blue (100%), with readable text. */
export function winProbCellStyle(prob: number): { backgroundColor: string; textColor: string } {
  const blue = [24, 98, 123];
  const white = [255, 255, 255];
  const yellow = [255, 230, 113];

  let r: number, g: number, b: number;

  if (prob >= 50) {
    const ratio = Math.min((prob - 50) / 50, 1);
    r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
    g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
    b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
  } else {
    const ratio = Math.min(prob / 50, 1);
    r = Math.round(yellow[0] + (white[0] - yellow[0]) * ratio);
    g = Math.round(yellow[1] + (white[1] - yellow[1]) * ratio);
    b = Math.round(yellow[2] + (white[2] - yellow[2]) * ratio);
  }

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = brightness > 140 ? "#000000" : "#ffffff";

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    textColor: textColor,
  };
}

/** Location cell: letter and colors for Home, Away, anything else Neutral. */
export function locationStyle(location: string): {
  label: string;
  letter: string;
  background: string;
  color: string;
} {
  if (location === "Home") return { label: "Home", letter: "H", background: "#dcfce7", color: "#15803d" };
  if (location === "Away") return { label: "Away", letter: "A", background: "#fee2e2", color: "#991b1b" };
  return { label: "Neutral", letter: "N", background: "#fef3c7", color: "#d97706" };
}
