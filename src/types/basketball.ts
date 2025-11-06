// src/types/basketball.ts

// Core data types
export interface Standing {
  // Core team info
  team_name: string;
  logo_url: string;
  conference: string;
  primary_color?: string;
  secondary_color?: string;
  total_scenarios: number;

  // Records
  conference_record: string;
  overall_record?: string;
  conference_wins: number;
  conference_losses: number;
  record?: string;

  // Standings projections
  avg_standing: number;
  standings_distribution: Record<number, number>;

  // No-ties standings projections (optional properties)
  Conf_Standing_No_Ties_Avg?: number;
  Standing_Dist_No_Ties?: Record<number, number>;

  // Wins projections
  avg_projected_conf_wins: number;
  conf_wins_distribution: Record<number, number>;
  wins_conf_percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };

  // Percentile properties for box whisker chart
  wins_conf_05?: number;
  wins_conf_25?: number;
  wins_conf_50?: number;
  wins_conf_75?: number;
  wins_conf_95?: number;

  // Tournament projections
  tournament_bid_pct?: number;
  avg_seed?: number;
  seed_distribution?: Record<number, number>;

  // ADD these for total season wins:
  total_wins_distribution?: Record<number, number>;
  avg_projected_total_wins?: number;

  // Total season wins percentiles for box whisker
  wins_total_05?: number;
  wins_total_25?: number;
  wins_total_50?: number;
  wins_total_75?: number;
  wins_total_95?: number;

  // Regular season wins fields
  reg_wins_distribution?: { [key: string]: number };
  avg_reg_season_wins?: number;
  avg_kp40_reg_season_wins?: number;
  reg_season_twv?: number;
  wins_reg_05?: number;
  wins_reg_25?: number;
  wins_reg_50?: number;
  wins_reg_75?: number;
  wins_reg_95?: number;
}

// CWV Related Types
export interface CWVTeam {
  team_name: string;
  logo_url: string;
  cwv: number;
  current_record: string;
  est_avg_record: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface CWVGame {
  rank: number;
  team: string;
  win_prob: number;
  date?: string;
  status?: "W" | "L" | "scheduled";
}

export interface CWVData {
  teams: CWVTeam[];
  games: CWVGame[];
}

// Schedule Related Types
export interface ScheduleGame {
  opponent: string;
  location: string;
  status: string; // 'W', 'L', or date string like '12/15'
  is_next_game?: boolean;
  date?: string;
}

export interface ScheduleTeam {
  team_name: string;
  logo_url: string;
  games: ScheduleGame[];
  total_games?: number;
  expected_wins?: number;
  quartile_games?: {
    top: number;
    second: number;
    third: number;
    bottom: number;
  };
}

export interface ScheduleOpponent {
  name: string;
  location: string; // 'Home', 'Away', 'Neutral'
  logo_url?: string;
  win_probability: number; // 0.0 to 1.0
  win_probability_display: string; // "75%"
}

export interface ScheduleData {
  Loc: string; // Location (Home/Away/Neutral)
  Team: string; // Opponent team name
  Win_Pct?: string; // Win probability as formatted string (e.g., "75%")
  Win_Pct_Raw?: number; // Raw win probability for calculations
  games: Record<string, string> | string; // Team game results
}

export interface ScheduleSummary {
  total_games: number;
  expected_wins: number;
  top_quartile: number;
  second_quartile: number;
  third_quartile: number;
  bottom_quartile: number;
}

// API Response Types
export interface StandingsApiResponse {
  data: Standing[];
  conferences: string[];
}

export interface CWVApiResponse {
  data: CWVData;
  conferences: string[];
}

export interface ScheduleApiResponse {
  data: ScheduleData[];
  teams: string[];
  team_logos: Record<string, string>;
  summary: Record<string, ScheduleSummary>;
  conferences: string[];
}

export interface ConferencesResponse {
  conferences: string[];
}

// UI and Chart Types
export interface ColorStyle {
  backgroundColor: string;
  color: string;
}

export type ColorScheme = "blue" | "yellow" | "green" | "red";

export interface BoxPlotData {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  team: string;
  outliers?: number[];
}

export interface TableRow {
  [key: string]: string | number | boolean | undefined;
  isSummary?: boolean;
}

export interface TableHeader {
  id: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

// Team and Game Types
export interface Team {
  id: number;
  name: string;
  conference: string;
  logo_url: string;
  primary_color?: string;
  secondary_color?: string;
  mascot?: string;
  city?: string;
  state?: string;
}

export interface Game {
  id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  status: "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
  venue?: string;
  conference_game: boolean;
}

export interface GamePrediction {
  game_id: number;
  home_team: string;
  away_team: string;
  home_win_probability: number;
  away_win_probability: number;
  predicted_home_score: number;
  predicted_away_score: number;
  spread: number;
  total: number;
  confidence: number;
}

// Tournament Types
export interface TournamentBid {
  team_name: string;
  bid_probability: number;
  average_seed: number;
  seed_distribution: Record<string, number>;
  conference: string;
}

export interface Bracket {
  region: string;
  seeds: Array<{
    seed: number;
    team: string;
    probability: number;
  }>;
}

// Conference Tournament Types
export interface ConferenceTournament {
  team_name: string;
  team_id: string;
  logo_url: string;
  Champion: number;
  Finals: number;
  Semifinals: number;
  Quarterfinals: number;
  First_Round?: number;
  Second_Round?: number;
  Third_Round?: number;
  Fourth_Round?: number;
}

// NCAA Tournament Types
export interface NCAATeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  NCAA_Champion: number;
  NCAA_Championship: number;
  NCAA_Final_Four: number;
  NCAA_Elite_Eight: number;
  NCAA_Sweet_Sixteen: number;
  NCAA_Second_Round: number;
  NCAA_First_Round: number;
}

// Seed Distribution Types
export interface SeedTeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  average_seed?: number;
  seed_distribution: Record<string, number>;
  tournament_bid_pct?: number;
  first_four_out: number;
  next_four_out: number;
}

// TWV (Total Win Value) Types
export interface TWVTeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  twv: number;
  actual_record: string;
  expected_record: string;
  rank: number;
}

// Individual Team Data Types
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
  adjusted_efficiency?: number;
  seed_distribution: Record<string, number>;
  win_seed_counts: WinSeedCount[];
}

export interface WinSeedCount {
  Wins: number;
  Seed: string | number;
  Tournament_Status: string;
  Count: number;
  Percentage: number;
  OutOfTourney?: boolean;
}

export interface TeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  kenpom_rank?: number;
  team_points?: number;
  opp_points?: number;
}

export interface TeamApiResponse {
  team_info: TeamInfo;
  schedule: TeamGame[];
}

// Conference Data Types
export interface ConferenceData {
  conference_name: string;
  logo_url: string;
  average_bids: number;
  bid_distribution: Record<string, number>;
}

export interface ConferenceApiResponse {
  data: ConferenceData[];
}

// Filter and UI Types
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

export interface UserPreferences {
  defaultConference: string;
  favoriteTeams: string[];
  autoRefresh: boolean;
  refreshInterval: number;
  theme: "light" | "dark" | "system";
  enableNotifications: boolean;
  enableAnimations: boolean;
}

// Performance and Monitoring Types
export interface PerformanceMetrics {
  renderTime: number;
  loadTime: number;
  componentCount: number;
}

export interface ApiMetrics {
  endpoint: string;
  duration: number;
  status: number;
  timestamp: number;
}

// Constants
export const CONFERENCES = [
  "ACC",
  "Big 12",
  "Big East",
  "Big Ten",
  "Pac-12",
  "SEC",
  "American",
  "Atlantic 10",
  "Conference USA",
  "MAC",
  "Mountain West",
  "WCC",
  "America East",
  "ASUN",
  "Big Sky",
  "Big South",
  "Big West",
  "CAA",
  "Horizon",
  "Ivy League",
  "MAAC",
  "MEAC",
  "MVC",
  "NEC",
  "OVC",
  "Patriot",
  "Southern",
  "Southland",
  "Summit",
  "Sun Belt",
  "SWAC",
  "WAC",
] as const;

export const TOURNAMENT_REGIONS = ["East", "West", "South", "Midwest"] as const;

export const GAME_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "postponed",
  "cancelled",
] as const;

export const LOCATIONS = ["Home", "Away", "Neutral"] as const;

export const TOURNAMENT_ROUNDS = [
  "First_Round",
  "Second_Round",
  "Third_Round",
  "Fourth_Round",
  "Quarterfinals",
  "Semifinals",
  "Finals",
  "Champion",
] as const;

export const NCAA_ROUNDS = [
  "NCAA_First_Round",
  "NCAA_Second_Round",
  "NCAA_Sweet_Sixteen",
  "NCAA_Elite_Eight",
  "NCAA_Final_Four",
  "NCAA_Championship",
  "NCAA_Champion",
] as const;

// Type unions
export type ConferenceType = (typeof CONFERENCES)[number];
export type TournamentRegion = (typeof TOURNAMENT_REGIONS)[number];
export type GameStatus = (typeof GAME_STATUSES)[number];
export type LocationType = (typeof LOCATIONS)[number];
export type TournamentRound = (typeof TOURNAMENT_ROUNDS)[number];
export type NCAARound = (typeof NCAA_ROUNDS)[number];

// Legacy type aliases for backward compatibility
export type StandingsTeam = Standing;
export type StandingsResponse = StandingsApiResponse;
export type CWVResponse = CWVApiResponse;
export type ConferenceName = string;
export type TeamName = string;
export type Season = string;

// Utility types
export type ApiResponse<T> = {
  data: T;
  conferences: string[];
  success?: boolean;
  message?: string;
  timestamp?: string;
};

export type TableData<T = unknown> = {
  headers: TableHeader[];
  rows: T[];
  summary?: Record<string, unknown>;
};

export type ChartData = {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
};

// Error types
export interface BasketballError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}

// Pagination types
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
  conferences?: string[];
}

// Search and filter types
export interface SearchFilters {
  conference?: string;
  team?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  gameStatus?: GameStatus[];
  location?: LocationType[];
}

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

// Export configuration types
export interface ExportConfig {
  format: "csv" | "json" | "xlsx" | "png" | "pdf";
  includeHeaders: boolean;
  includeFilters: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Analytics and tracking types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

export interface UserInteraction {
  type: "click" | "hover" | "scroll" | "search" | "filter";
  target: string;
  value?: unknown;
  timestamp: Date;
}

// Component prop types
export interface BaseTableProps {
  data: unknown[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export interface BaseChartProps {
  data: ChartData;
  loading?: boolean;
  error?: string | null;
  height?: number;
  width?: number;
  className?: string;
}

// Responsive design types
export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

export interface ResponsiveConfig {
  showColumns: string[];
  columnWidths: Record<string, number>;
  fontSize: string;
  spacing: string;
}

// Theme types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface NCAATeamApiResponse {
  data: NCAATeam[];
  conferences: string[];
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  typography: {
    fontFamily: string;
    fontSize: Record<string, string>;
    fontWeight: Record<string, number>;
    lineHeight: Record<string, number>;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
}
