// Types for the football team schedule-difficulty chart.

export interface FootballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  opponent_primary_color?: string;
  location: string;
  status: string;
  sag12_win_prob?: number;
  opp_rating?: number;
  sagarin_rank?: number;
  team_conf?: string;
  team_conf_catg?: string;
}

export interface AllScheduleGame {
  team: string;
  opponent: string;
  opponent_primary_color?: string;
  sag12_win_prob: number;
  opp_rating?: number;
  sagarin_rank?: number;
  team_conf: string;
  team_conf_catg: string;
  status: string;
}

export interface GameWithPosition extends FootballTeamGame {
  percentilePosition: number;
  gameIndex: number;
}

export interface PositionedGame extends GameWithPosition {
  isRightSide: boolean;
  adjustedY: number;
}

export interface TeamStats {
  wins: number;
  losses: number;
  expectedWins: number;
  expectedLosses: number;
  forecastWinPct: number;
  actualWinPct: number;
  twv: number;
}

export interface Percentile {
  percentile: number;
  value: number;
}

export interface DifficultyStats {
  total: number;
  wins: number;
  losses: number;
  scheduled: number;
}

export type ComparisonFilter = "all_fbs" | "power_4" | "non_power_4" | "conference";
export type GameFilter = "all" | "completed" | "wins" | "losses" | "remaining";
