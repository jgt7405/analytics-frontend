// Types for the basketball compare-schedules chart.

export type ComparisonFilter = "all_d1" | "power_6" | "non_power_6" | "teams_selected";
export type GameFilter = "all" | "completed" | "wins" | "losses" | "remaining";
export type LocationFilter = "all" | "home" | "away" | "neutral";

/** One selected team, as the compare page builds it. */
export interface TeamSchedule {
  teamName: string;
  teamLogo: string;
  teamColor: string;
  teamConference: string;
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
  location: string;
  teamConference: string;
  isHighProb: boolean;
}

export interface GameWithPosition extends TeamGame {
  percentilePosition: number;
}

export interface PositionedGame extends GameWithPosition {
  adjustedY: number;
  isRightSide: boolean;
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
  twv_50: number;
  actualWinPct: number;
  highProbWins: number;
  highProbLosses: number;
  highProbGames: number;
}
