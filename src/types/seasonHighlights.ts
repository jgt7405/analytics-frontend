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
  /** Every conference on the schedule, so the filter is complete before any
   *  games have been played (older responses may omit it). */
  conferences?: string[];
  /** Logo per team name. Basketball sends logos here once instead of on
   *  every row (its full-season lists run to thousands of games); rows then
   *  omit team_logo / opponent_logo. See withLogos(). */
  logos?: Record<string, string>;
}

const DEFAULT_LOGO = "/images/team_logos/default.png";

/** The response with every row's logos filled in from `logos`. */
export function withLogos(response: SeasonHighlightsResponse): SeasonHighlightsResponse {
  const { logos } = response;
  if (!logos) return response;
  const fill = (rows: SeasonHighlightGame[]) =>
    rows.map((row) => ({
      ...row,
      team_logo: row.team_logo || logos[row.team] || DEFAULT_LOGO,
      opponent_logo: row.opponent_logo || logos[row.opponent] || DEFAULT_LOGO,
    }));
  return {
    ...response,
    upsets: fill(response.upsets),
    best_wins: fill(response.best_wins),
    worst_losses: fill(response.worst_losses),
  };
}
