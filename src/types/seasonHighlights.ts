// Season info page rows (biggest upsets / best wins / worst losses), shared by
// /api/football/season_highlights and /api/basketball/season_highlights.
export interface SeasonHighlightGame {
  team: string;
  team_logo: string;
  team_color?: string;
  opponent: string;
  opponent_logo: string;
  opponent_color?: string;
  win_prob: number | null;
  team_points: number | null;
  opp_points: number | null;
  date: string;
  /** ISO (YYYY-MM-DD) form of `date`, for the date-range filter. */
  date_iso: string | null;
  location: string;
  team_conf: string;
  team_conf_catg: string;
}

export interface SeasonHighlightsResponse {
  upsets: SeasonHighlightGame[];
  best_wins: SeasonHighlightGame[];
  worst_losses: SeasonHighlightGame[];
}
