// Types for the basketball wins-to-seed chart.

import type { ConfChampAnalysisRow } from "@/hooks/useBasketballConfChampAnalysis";

export type ConfChampData = ConfChampAnalysisRow;

export interface BasketballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  opponent_primary_color?: string;
  location: string;
  status: string;
  rk50_win_prob?: number;
  team_win_prob?: number;
  team_conf?: string;
}

/** A game as charted: its win probability as `winProb` (0-1). */
export type ChartGame = BasketballTeamGame & { winProb: number };

export interface LogoPosition {
  game: ChartGame;
  yPosition: number;
  gameNumber: number;
  logoX: number;
}

/** Geometry shared by the chart's parts; see computeLayout. */
export interface ChartLayout {
  isMobile: boolean;
  chartWidth: number;
  chartHeight: number;
  maxGames: number;
  chartAreaTop: number;
  chartAreaBottom: number;
  chartAreaHeight: number;
  barX: number;
  barWidth: number;
  barBottomY: number;
  barTopY: number;
  /** Right edge of the seed bands. */
  regionRight: number;
  /** y of a number of wins on the bar's scale. */
  getYFromWins: (wins: number) => number;
}

/** Wins needed for each seed line, 0 when unknown. */
export interface SeedThresholds {
  bubbleWins: number;
  seed10Wins: number;
  seed7Wins: number;
  seed4Wins: number;
  seed1Wins: number;
}
