// Data shapes used by the basketball game preview and its services.

export interface TeamGameData {
  date: string;
  opponent: string;
  opponent_logo?: string;
  opponent_primary_color?: string;
  location: string;
  status: string;
  twv_50?: number;
  cwv?: number;
  kenpom_rank?: number;
  team_win_prob?: number;
  rk50_win_prob?: number;
  team_points?: number;
  opp_points?: number;
  team_conf?: string;
}

export interface WinSeedCountEntry {
  Wins: number;
  Seed?: string;
  Tournament_Status?: string;
  Count: number;
  Auto_Bid_Pct?: number;
  At_Large_Pct?: number;
}

export interface TeamInfo {
  team_name: string;
  team_id: string;
  conference: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  overall_record: string;
  conference_record: string;
  tournament_bid_pct?: number;
  average_seed?: number;
  kenpom_rank?: number;
  win_seed_counts: WinSeedCountEntry[];
  current_conf_standing?: number;
}

export interface AllScheduleGame {
  team: string;
  opponent: string;
  rk50_win_prob: number;
  team_conf: string;
  team_conf_catg?: string;
  status: string;
}

export interface TeamDataResponse {
  team_info: TeamInfo;
  schedule: TeamGameData[];
  all_schedule_data?: AllScheduleGame[];
}

export interface UpcomingGame {
  date: string;
  date_sort: string;
  home_team: string;
  away_team: string;
  home_team_logo: string;
  away_team_logo: string;
  home_team_conference: string;
  away_team_conference: string;
  home_team_color: string;
  away_team_color: string;
  is_conference_game: boolean;
  location: string;
  win_prob: number | null;
  label: string;
  is_next_game_for_both: boolean;
  game_id: string;
}

export interface ComputedMetrics {
  overallRecord: string;
  conferenceRecord: string;
  kenpomRank: number | null;
  currentStreak: string;
  last5: string;
  last10: string;
  homeRecord: string;
  awayRecord: string;
  neutralRecord: string;
  currentConfStanding: number | null;
  confPosition: string;
}

export interface NextGameMetrics {
  first_seed_pct: number;
  top4_pct: number;
  top8_pct: number;
  avg_seed: number;
  avg_conf_wins: number;
  num_teams: number;
  // NCAA tournament projection fields
  tournament_bid_pct?: number;
  average_seed?: number | null;
  ncaa_seed_distribution?: Record<string, number>;
  // Dynamic keys: seed_N_pct
  [key: string]: number | Record<string, number> | null | undefined;
}

export interface NextGameImpactData {
  success: boolean;
  team_id: number;
  team_name: string;
  opponent_id: number;
  opponent_name: string;
  is_home: boolean;
  game: {
    game_id: number;
    date: string;
    home_team: string;
    away_team: string;
    home_team_id: number;
    away_team_id: number;
    home_team_logo: string;
    away_team_logo: string;
    home_probability: number | null;
    away_probability: number | null;
  } | null;
  current: Record<number, NextGameMetrics>;
  with_win: Record<number, NextGameMetrics>;
  with_loss: Record<number, NextGameMetrics>;
  calculation_time: number;
  error?: string;
}

export interface ConferenceStandingsTeam {
  team_name: string;
  teamid: number;
  conference_record: string;
  conf_wins: number;
  conf_losses: number;
}

export interface ConfChampData {
  team_name: string;
  actual_total_wins?: number;
  actual_total_losses?: number;
  proj_losses?: number;
  pct_prob_win_conf_tourney_game_1: number;
  pct_prob_win_conf_tourney_game_2: number;
  pct_prob_win_conf_tourney_game_3: number;
  pct_prob_win_conf_tourney_game_4: number;
  pct_prob_win_conf_tourney_game_5: number;
  pct_prob_win_conf_tourney_game_6: number;
  wins_for_bubble: number;
  wins_for_1_seed: number;
  wins_for_2_seed: number;
  wins_for_3_seed: number;
  wins_for_4_seed: number;
  wins_for_5_seed: number;
  wins_for_6_seed: number;
  wins_for_7_seed: number;
  wins_for_8_seed: number;
  wins_for_9_seed: number;
  wins_for_10_seed: number;
  season_total_proj_wins_avg: number;
}

