import { FootballStanding } from "@/types/football";

/**
 * Regular-season records for the wins and standings pages.
 *
 * A conference championship game is postseason: it counts toward the records
 * on team pages (actual_total_* / actual_conference_*), but not on the wins
 * and standings pages, whose simulations leave it out too. Archived seasons
 * saved before the actual_reg_* fields existed fall back to the full record,
 * which is the same thing until championship week.
 */

export function regSeasonRecord(team: FootballStanding): {
  wins: number;
  losses: number;
} {
  return {
    wins: team.actual_reg_season_wins ?? team.actual_total_wins ?? 0,
    losses: team.actual_reg_season_losses ?? team.actual_total_losses ?? 0,
  };
}

export function regConfRecord(team: FootballStanding): {
  wins: number;
  losses: number;
  winPct: number | undefined;
} {
  if (team.actual_reg_conf_wins != null && team.actual_reg_conf_losses != null) {
    return {
      wins: team.actual_reg_conf_wins,
      losses: team.actual_reg_conf_losses,
      winPct: team.actual_reg_conf_win_pct ?? undefined,
    };
  }
  return {
    wins: team.actual_conference_wins ?? 0,
    losses: team.actual_conference_losses ?? 0,
    winPct: team.actual_conference_win_pct ?? undefined,
  };
}
