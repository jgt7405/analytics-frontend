// src/types/football.ts

import type { GameSelection } from "@/hooks/useFootballWhatIf";
export interface FootballStanding {
  team_name: string;
  team_id: string;
  logo_url: string;
  conference: string;
  primary_color?: string;
  secondary_color?: string;

  // Current records
  actual_conference_wins: number;
  actual_conference_losses: number;
  actual_total_wins: number;
  actual_total_losses: number;

  // Projections
  avg_standing: number;
  standings_distribution?: Record<string, number>;

  // No-ties standings projections
  standing_dist_no_ties?: Record<string, number>;
  conf_standing_no_ties_avg?: number;

  // Conference wins
  conf_wins_distribution?: Record<string, number>;
  conf_wins_proj?: number;

  // Percentile fields for box whisker chart
  wins_conf_05?: number;
  wins_conf_25?: number;
  wins_conf_50?: number;
  wins_conf_75?: number;
  wins_conf_95?: number;

  // Regular season wins fields
  reg_wins_distribution?: { [key: string]: number };
  avg_reg_season_wins?: number;
  avg_sag12_reg_season_wins?: number;
  reg_season_twv?: number;
  wins_reg_05?: number;
  wins_reg_25?: number;
  wins_reg_50?: number;
  wins_reg_75?: number;
  wins_reg_95?: number;

  // Playoff data
  playoff_bids?: number;
  conference_champion_bids?: number;
  at_large_bids?: number;
  first_four_out?: number;
  next_four_out?: number;
  playoff_bid_pct?: number;
  cfp_bid_pct?: number;
  average_seed?: number;

  // Conference championship
  Champ_Game?: number; // Championship game appearance percentage
  champion?: number;

  // TWV (Team Win Value)
  twv_avg?: number;

  // Simulation metadata
  total_scenarios: number;
  conference_id?: number;
  kenpom_rank?: number;
  net_rating?: number;
}

export interface FootballStandingsApiResponse {
  data: FootballStanding[];
  conferences: string[];
}

export interface FootballTWVData {
  team_name: string;
  team_id: string;
  logo_url: string;
  twv: number;
  actual_record: string;
  expected_record: string;
  rank: number;
}

export interface FootballTWVApiResponse {
  data: FootballTWVData[];
  conferences: string[];
}

export interface FootballPlayoffData {
  team_name: string;
  team_id: string;
  logo_url: string;
  conference: string;
  playoff_bid_pct: number;
  average_seed: number;
  seed_distribution: Record<string, number>;
  conference_champion_bids: number;
  at_large_bids: number;
  first_four_out: number;
  next_four_out: number;
}

export interface FootballPlayoffApiResponse {
  data: FootballPlayoffData[];
  conferences: string[];
}

// CWV Related Types
export interface FootballCWVTeam {
  team_name: string;
  logo_url: string;
  cwv: number;
  current_record: string;
  est_avg_record: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface FootballCWVGame {
  rank: number;
  team: string;
  win_prob: number;
  date?: string;
  status?: "W" | "L" | "scheduled";
}

export interface FootballCWVData {
  teams: FootballCWVTeam[];
  games: FootballCWVGame[];
}

export interface FootballCWVApiResponse {
  data: FootballCWVData;
  conferences: string[];
}

export interface FootballScheduleData {
  Loc: string;
  Team: string;
  Win_Pct: string;
  Win_Pct_Raw: number;
  games: Record<string, string>;
  conf_game: string | boolean;
}

export interface FootballScheduleResponse {
  data: FootballScheduleData[];
  teams: string[];
  team_logos: Record<string, string>;
  conferences: string[];
  summary: Record<
    string,
    {
      total_games: number;
      expected_wins: number;
      top_quartile: number;
      second_quartile: number;
      third_quartile: number;
      bottom_quartile: number;
    }
  >;
}

export interface FootballTWVTeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  twv: number;
  actual_record: string;
  expected_record: string;
  rank: number;
}

export interface FootballTWVApiResponse {
  data: FootballTWVTeam[];
  conferences: string[];
}

// Conference Championship Types
export interface FootballConfChamp {
  team_name: string;
  team_id: string;
  logo_url: string;
  Champ_Game: number; // Championship game appearance percentage
  Champion: number; // Championship win percentage
}

export interface FootballConfChampApiResponse {
  data: FootballConfChamp[];
  conferences: string[];
}

// CFP (College Football Playoff) Types
export interface FootballCFPTeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  CFP_Champion: number;
  CFP_Championship: number;
  CFP_Semifinals: number;
  CFP_Quarterfinals: number;
  CFP_First_Round: number;
}

export interface FootballCFPApiResponse {
  data: FootballCFPTeam[];
  conferences: string[];
}

// Seed Data Types
export interface FootballSeedData {
  team_name: string;
  team_id: string;
  logo_url: string;
  cfp_bid_pct: number;
  average_seed: number;
  seed_distribution: Record<string, number>;
  first_four_out: number;
  next_four_out: number;
  conf_champ_overall_pct?: number; // NEW
  at_large_overall_pct?: number; // NEW
}

export interface FootballSeedApiResponse {
  data: FootballSeedData[];
  conferences: string[];
}

// Win-Seed Count Data Types
export interface FootballWinSeedCount {
  Wins: number;
  Seed: string | number;
  Playoff_Status: string;
  Count: number;
  Percentage: number;
  Conf_Champ_Pct?: number; // NEW
  At_Large_Pct?: number; // NEW
}

// Conference Data Types
export interface FootballConferenceData {
  conference_name: string;
  logo_url: string;
  average_bids: number;
  bid_distribution: Record<string, number>;
  teamcount: number;
  teams: string[];
  sagarin_min: number;
  sagarin_q25: number;
  sagarin_median: number;
  sagarin_q75: number;
  sagarin_max: number;
}

export interface FootballConferenceApiResponse {
  data: FootballConferenceData[];
}

// Teams Data Types
export interface FootballTeam {
  team_name: string;
  team_id: string;
  conference: string;
  logo_url: string;
  overall_record: string;
  conference_record: string;
  cfp_bid_pct: number;
  average_seed?: number;
}

export interface FootballTeamsApiResponse {
  data: FootballTeam[];
}

// Individual Team Data Types
export interface FootballTeamInfo {
  team_name: string;
  team_id: string;
  conference: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  overall_record: string;
  conference_record: string;
  cfp_bid_pct: number;
  average_seed?: number;
  seed_distribution: Record<string, number>;
  conf_champ_overall_pct?: number;
  at_large_overall_pct?: number;
  no_bid_pct?: number;
  // Add these missing properties:
  sagarin_rank?: number;
  win_seed_counts?: Array<{
    Seed: string | number;
    Percentage: number;
    Tournament_Status: string;
    Wins: number;
    Count: number;
    Conf_Champ_Pct?: number;
    At_Large_Pct?: number;
  }>;
}

export interface FootballTeamGame {
  date: string;
  opponent: string;
  opponent_logo: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  sagarin_rank?: number;
  // Add these new fields:
  opp_rnk?: number;
  team_win_prob?: number;
  sag12_win_prob?: number;
  team_points?: number;
  opp_points?: number;
}

export interface FootballTeamData {
  team_info: FootballTeamInfo;
  schedule: FootballTeamGame[];
}

export interface FootballTeamApiResponse {
  team_info: FootballTeamInfo;
  schedule: FootballTeamGame[];
}

export interface ConferenceData {
  conference: string;
  teamcount: number;
  teams: string[];
  sagarin_min: number;
  sagarin_q25: number;
  sagarin_median: number;
  sagarin_q75: number;
  sagarin_max: number;
  totalbidsdistribution: Record<string, number>;
  averagebidsperscenario: number;
  created_date: string;
  created_timestamp: string;
  version_id: string;
  is_current: boolean;
}

export interface PlayoffTeam {
  rank: number;
  team_name: string;
  logo_url: string;
  conference: string;
  twv: number;
  record: string;
  bid_type: "Conference Champion" | "At-Large";
}

export interface BubbleTeam {
  position: number;
  team_name: string;
  logo_url: string;
  conference: string;
  twv: number;
  record: string;
}

export interface PlayoffRankingsResponse {
  playoff_teams: PlayoffTeam[];
  first_four_out: BubbleTeam[];
  next_four_out: BubbleTeam[];
}

export interface ConferenceApiResponse {
  data: ConferenceData[];
}

// frontend/src/types/football.ts - Add these interfaces

export interface WhatIfGame {
  game_id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_team_id: number;
  away_team_id: number;
  home_team_logo?: string;
  away_team_logo?: string;
  home_probability: number;
  away_probability: number;
  completed: boolean;
  conf_game: boolean;
}

export interface WhatIfTeamResult {
  team_name: string;
  team_id: number;
  teamid?: number;
  conference: string;
  logo_url: string;
  avg_projected_conf_wins: number;
  avg_reg_season_wins: number;
  avg_conference_standing: number;
  conf_champ_game_played: number;
  conf_champ_game_won: number;
  conf_champ_pct: number;
  playoff_bid_pct: number;
  cfp_bid_pct: number;
  totalscenarios: number;
  // Computed fields for UI
  projected_total_wins: number;
  cfp_probability: number;
  // Aliases for compatibility
  projected_conf_wins?: number;
  avg_conf_standing?: number;
}

export interface WhatIfResponse {
  success: boolean;
  data: WhatIfTeamResult[];
  metadata: {
    num_scenarios: number;
    num_selections: number;
    calculation_time: number;
    selections: GameSelection[];
  };
}

// Filter and UI Types
export interface FootballFilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FootballLoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

// Performance and Monitoring Types
export interface FootballPerformanceMetrics {
  renderTime: number;
  loadTime: number;
  componentCount: number;
}

export interface FootballApiMetrics {
  endpoint: string;
  duration: number;
  status: number;
  timestamp: number;
}

// Constants
export const FOOTBALL_CONFERENCES = [
  "ACC",
  "American Athletic",
  "Atlantic Coast",
  "Big 12",
  "Big Ten",
  "Conference USA",
  "Independent",
  "Mid-American",
  "Mountain West",
  "Pac-12",
  "SEC",
  "Southeastern",
  "Sun Belt",
] as const;

export const CFP_ROUNDS = [
  "CFP_First_Round",
  "CFP_Quarterfinals",
  "CFP_Semifinals",
  "CFP_Championship",
  "CFP_Champion",
] as const;

export const FOOTBALL_SEASONS = ["2024", "2023", "2022"] as const;

// Type unions
export type FootballConferenceType = (typeof FOOTBALL_CONFERENCES)[number];
export type CFPRound = (typeof CFP_ROUNDS)[number];
export type FootballSeason = (typeof FOOTBALL_SEASONS)[number];

// Legacy type aliases for backward compatibility
export type FootballStandingsTeam = FootballStanding;
export type FootballStandingsResponse = FootballStandingsApiResponse;
export type FootballCWVResponse = FootballCWVApiResponse;
export type FootballConferenceName = string;
export type FootballTeamName = string;

// Utility types
export type FootballApiResponse<T> = {
  data: T;
  conferences: string[];
  success?: boolean;
  error?: string | null;
};
