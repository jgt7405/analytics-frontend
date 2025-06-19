// src/types/football.ts
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

  // Playoff data
  playoff_bids?: number;
  conference_champion_bids?: number;
  at_large_bids?: number;
  first_four_out?: number;
  next_four_out?: number;
  playoff_bid_pct?: number;
  average_seed?: number;

  // Conference championship
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
