// Types for the basketball team schedule-difficulty chart.

export interface BasketballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  opponent_primary_color?: string;
  location: string;
  status: string;
  rk50_win_prob?: number;
  team_conf?: string;
}

export interface AllScheduleGame {
  team: string;
  opponent: string;
  rk50_win_prob: number;
  team_conf: string;
  team_conf_catg?: string;
  status: string;
}

export interface GameWithPosition extends BasketballTeamGame {
  percentilePosition: number;
  gameIndex: number;
  isHighProb: boolean;
}

export interface PositionedGame extends GameWithPosition {
  isRightSide: boolean;
  adjustedY: number;
  columnIndex: number;
}

export type ComparisonFilter = "all_d1" | "power_6" | "non_power_6" | "conference";
export type GameFilter = "all" | "completed" | "wins" | "losses" | "remaining";
export type LocationFilter = "all" | "home" | "away" | "neutral";

export interface Percentile {
  percentile: number;
  value: number;
}

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HighProbRecord {
  wins: number;
  losses: number;
  remaining: number;
}

export interface TeamStats {
  wins: number;
  losses: number;
  expectedWins: number;
  expectedLosses: number;
  forecastWinPct: number;
  twv_50: number;
  actualWinPct: number;
  highProbWins: number;
  highProbLosses: number;
  highProbGames: number;
}
