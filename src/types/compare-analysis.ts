// GET /<sport>/compare/analysis: who uses the Compare Schedules page and which
// teams they put side by side (backend app/api/compare_analysis.py).
//
// An "add" is one team joining a comparison. A "comparison" is one compare
// page view where at least one team was added, described by the most teams
// it had on screen at once. A pair is counted when a hand-picked team joins a
// comparison that already holds the other team (rank quick-select batches
// are left out of pairs). Times are ISO 8601 strings.

export interface CompareAnalysisResponse {
  sport: "basketball" | "football";
  period: string;
  timezone: string;
  /** When the first compare event was recorded; null before tracking began. */
  tracking_since: string | null;
  summary: {
    adds: number;
    hand_picks: number;
    rank_adds: number;
    comparisons: number;
    multi_team_comparisons: number;
    average_teams: number;
    visitors: number;
    teams: number;
    pairs: number;
    page_views: number;
    page_visitors: number;
    /** Share of pairings (with both conferences known) inside one conference. */
    same_conference_pair_share: number | null;
    latest_event: string | null;
  };
  daily: Array<{ date: string; adds: number; comparisons: number }>;
  teams: Array<{
    team: string;
    conference: string | null;
    adds: number;
    hand_picks: number;
    rank_adds: number;
    /** Times it was the first team added to a comparison. */
    first_picks: number;
    visitors: number;
  }>;
  pairs: Array<{
    team_a: string;
    team_b: string;
    conference_a: string | null;
    conference_b: string | null;
    same_conference: boolean;
    times: number;
    visitors: number;
    latest: string | null;
  }>;
  conferences: Array<{ conference: string; adds: number; hand_picks: number; rank_adds: number; teams: number }>;
  conference_matchups: Array<{ conference_a: string; conference_b: string; times: number; pairs: number }>;
  sizes: Array<{ teams: number; comparisons: number }>;
  /** Exact team sets (alphabetical) seen in more than one comparison. */
  sets: Array<{ teams: string[]; times: number; visitors: number }>;
  /** Latest comparisons, teams in the order they were selected. */
  recent: Array<{ occurred_at: string; teams: string[]; size: number; season: string | null }>;
}
