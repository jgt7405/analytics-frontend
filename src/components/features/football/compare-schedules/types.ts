// Types for the football compare-schedules chart.

export type ComparisonFilter = "all_fbs" | "power_4" | "non_power_4" | "teams_selected";
export type GameFilter = "all" | "completed" | "wins" | "losses" | "remaining";

/** One selected team, as the compare page builds it. */
export interface TeamSchedule {
  teamName: string;
  teamLogo: string;
  teamColor: string;
  teamConference: string;
  teamConfCategory?: string;
  games: {
    date: string;
    opponent: string;
    opponentLogo?: string;
    opponentColor: string;
    winProb: number;
    status: string;
    location: string;
  }[];
  allScheduleData: {
    team: string;
    opponent: string;
    opponentColor: string;
    winProb: number;
    teamConference: string;
    teamConfCategory?: string;
    status: string;
  }[];
}

/** A shown game of a selected team, before its percentile is known. */
export interface TeamGame {
  teamIndex: number;
  gameIndex: number;
  opponent: string;
  opponentLogo?: string;
  opponentColor: string;
  winProb: number;
  status: string;
  location?: string;
  teamConference: string;
  teamConfCategory?: string;
}

export interface GameWithPosition extends TeamGame {
  percentilePosition: number;
}

export interface PositionedGame extends GameWithPosition {
  adjustedY: number;
}

export interface AllScheduleGame {
  team: string;
  opponent: string;
  opponentColor: string;
  winProb: number;
  teamConference: string;
  teamConfCategory?: string;
  status: string;
}

export interface Percentile {
  percentile: number;
  value: number;
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
