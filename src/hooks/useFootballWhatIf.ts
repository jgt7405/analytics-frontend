// frontend/src/hooks/useFootballWhatIf.ts

import { WhatIfGame, WhatIfTeamResult } from "@/types/football";
import { useMutation } from "@tanstack/react-query";

export interface GameSelection {
  game_id: number;
  winner_team_id: string;
}

export interface WhatIfRequest {
  conference: string;
  selections: GameSelection[];
}

export interface WhatIfResponse {
  success: boolean;
  data: WhatIfTeamResult[];
  current_projections: WhatIfTeamResult[];
  games: WhatIfGame[];
  metadata: {
    conference: string;
    num_scenarios: number;
    calculation_time: number;
    num_selections: number;
    num_games: number;
    num_current_projections: number;
  };
}

interface BackendTeamResult {
  team_name: string;
  team_id: number;
  teamid?: number;
  conference: string;
  logo_url: string;
  avg_projected_conf_wins: number;
  avg_reg_season_wins?: number;
  avg_conference_standing: number;
  top_2_probability?: number;
  conf_champ_game_played: number;
  conf_champ_game_won: number;
  conf_champ_pct: number;
  playoff_bid_pct: number;
  cfp_bid_pct: number;
  totalscenarios: number;
}

interface BackendWhatIfResponse {
  success: boolean;
  data: BackendTeamResult[];
  current_projections: BackendTeamResult[];
  games: WhatIfGame[];
  metadata: {
    conference: string;
    num_scenarios: number;
    calculation_time: number;
    num_selections: number;
    num_games: number;
    num_current_projections: number;
  };
}

const mapTeamResult = (team: BackendTeamResult): WhatIfTeamResult => ({
  team_id: team.team_id || team.teamid || 0,
  team_name: team.team_name,
  conference: team.conference,
  logo_url: team.logo_url,
  avg_projected_conf_wins: team.avg_projected_conf_wins || 0,
  avg_reg_season_wins: team.avg_reg_season_wins || 0,
  avg_conference_standing: team.avg_conference_standing || 0,
  conf_champ_game_played: team.conf_champ_game_played || 0,
  conf_champ_game_won: team.conf_champ_game_won || 0,
  conf_champ_pct: team.conf_champ_pct || 0,
  playoff_bid_pct: team.playoff_bid_pct || 0,
  cfp_bid_pct: team.cfp_bid_pct || team.playoff_bid_pct || 0,
  totalscenarios: team.totalscenarios || 1000,
  // Computed fields for UI compatibility
  projected_total_wins: team.avg_reg_season_wins || 0,
  cfp_probability: team.cfp_bid_pct || team.playoff_bid_pct || 0,
  projected_conf_wins: team.avg_projected_conf_wins || 0,
  avg_conf_standing: team.avg_conference_standing || 0,
});

const calculateWhatIf = async (
  request: WhatIfRequest
): Promise<WhatIfResponse> => {
  console.log("📤 Sending what-if request:", request);

  const response = await fetch("/api/proxy/football/whatif", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("❌ What-if API error:", errorData);
    throw new Error(errorData.error || "Failed to calculate what-if scenarios");
  }

  const data: BackendWhatIfResponse = await response.json();
  console.log("📥 Received what-if response:", {
    success: data.success,
    teams: data.data?.length || 0,
    games: data.games?.length || 0,
    current_projections: data.current_projections?.length || 0,
    metadata: data.metadata,
  });

  // Map the backend response to the frontend format
  const mappedData: WhatIfResponse = {
    success: data.success,
    data: (data.data || []).map(mapTeamResult),
    current_projections: (data.current_projections || []).map(mapTeamResult),
    games: data.games || [],
    metadata: data.metadata || {
      conference: request.conference,
      num_scenarios: 1000,
      calculation_time: 0,
      num_selections: request.selections.length,
      num_games: 0,
      num_current_projections: 0,
    },
  };

  console.log("✅ Mapped what-if data:", {
    teams: mappedData.data.length,
    games: mappedData.games.length,
    current_projections: mappedData.current_projections.length,
  });

  return mappedData;
};

export const useFootballWhatIf = () => {
  return useMutation<WhatIfResponse, Error, WhatIfRequest>({
    mutationFn: calculateWhatIf,
  });
};
