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
  games: WhatIfGame[]; // Add games to the response
  metadata: {
    conference: string;
    num_scenarios: number;
    calculation_time: number;
    num_selections: number;
    num_games: number; // Add num_games to metadata
  };
}

interface BackendTeamResult {
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
}

const calculateWhatIf = async (
  request: WhatIfRequest
): Promise<WhatIfResponse> => {
  const response = await fetch("/api/proxy/football/whatif", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to calculate what-if scenarios");
  }

  const data = await response.json();

  // Map the backend response to include computed fields for the UI
  const mappedData: WhatIfResponse = {
    ...data,
    data: data.data.map(
      (team: BackendTeamResult): WhatIfTeamResult => ({
        ...team,
        projected_total_wins: team.avg_reg_season_wins || 0,
        cfp_probability: team.cfp_bid_pct || team.playoff_bid_pct || 0,
        projected_conf_wins: team.avg_projected_conf_wins,
        avg_conf_standing: team.avg_conference_standing,
      })
    ),
  };

  return mappedData;
};

export const useFootballWhatIf = () => {
  return useMutation<WhatIfResponse, Error, WhatIfRequest>({
    mutationFn: calculateWhatIf,
  });
};
