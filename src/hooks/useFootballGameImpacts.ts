// src/hooks/useFootballGameImpacts.ts
export interface GameImpactOutcome {
  ccg_pct: number;
  cfp_pct: number;
  ccg_delta: number;
  cfp_delta: number;
}

export interface GameImpactRow {
  game_id: number;
  date: string;
  conf_game: boolean;
  home_team: string;
  home_team_id: number;
  home_team_logo?: string;
  home_probability: number | null;
  away_team: string;
  away_team_id: number;
  away_team_logo?: string;
  away_probability: number | null;
  involves_focus_conf: boolean;
  is_focus_game: boolean;
  category: "focus" | "conf" | "other" | null;
  will_simulate: boolean;
  simulated: boolean;
  if_home_win: GameImpactOutcome;
  if_away_win: GameImpactOutcome;
  max_abs_delta: number;
}

export interface GameImpactsResponse {
  success: boolean;
  conference: string;
  team_id: number;
  team_name: string;
  days: number;
  plan_only?: boolean;
  /** ISO timestamp of the nightly precompute these numbers came from (null = live). */
  computed_at?: string | null;
  baseline: { ccg_pct: number; cfp_pct: number };
  games: GameImpactRow[];
  sim_game_ids?: number[];
  sims_run?: number;
  calculation_time: number;
}

export interface GameImpactsRequest {
  conference: string;
  team_id: number;
  days?: number;
  plan_only?: boolean;
  game_ids?: number[];
}

export async function fetchGameImpacts(
  req: GameImpactsRequest,
  signal?: AbortSignal,
): Promise<GameImpactsResponse> {
  const response = await fetch("/api/proxy/football/whatif/game-impacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal: signal ?? AbortSignal.timeout(180000),
  });

  if (!response.ok) {
    let message = "Failed to calculate game impacts";
    try {
      const err = await response.json();
      message = err.error || message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }

  return response.json();
}
