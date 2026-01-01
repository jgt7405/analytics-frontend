// hooks/useBasketballWhatIf.ts

import { useMutation } from "@tanstack/react-query";

export interface GameSelection {
  game_id: number;
  winner_team_id: number;
}

export interface WhatIfRequest {
  conference: string;
  selections: GameSelection[];
}

export interface WhatIfGame {
  game_id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_team_id: number;
  away_team_id: number;
  home_probability: number;
  away_probability: number;
  conf_game: boolean;
}

export interface WhatIfTeamResult {
  team_id: number;
  team_name: string;
  conference: string;
  logo_url?: string;
  avg_projected_conf_wins?: number;
  avg_conference_standing?: number;
  standing_1_prob?: number;
  standing_2_prob?: number;
  standing_3_prob?: number;
  standing_4_prob?: number;
  standing_5_prob?: number;
  standing_6_prob?: number;
  standing_7_prob?: number;
  standing_8_prob?: number;
}

export interface WhatIfMetadata {
  conference: string;
  num_scenarios: number;
  calculation_time: number;
  num_selections: number;
  num_conference_games: number;
  num_current_projections: number;
}

export interface WhatIfResponse {
  success: boolean;
  data: WhatIfTeamResult[];
  current_projections: WhatIfTeamResult[];
  games: WhatIfGame[];
  metadata: WhatIfMetadata;
}

interface BackendTeamResult {
  team_name: string;
  team_id: number;
  teamid?: number;
  conference: string;
  logo_url?: string;
  avg_projected_conf_wins?: number;
  avg_conference_standing?: number;
  standing_1_prob?: number;
  standing_2_prob?: number;
  standing_3_prob?: number;
  standing_4_prob?: number;
  standing_5_prob?: number;
  standing_6_prob?: number;
  standing_7_prob?: number;
  standing_8_prob?: number;
}

interface BackendWhatIfResponse {
  success: boolean;
  data: BackendTeamResult[];
  current_projections: BackendTeamResult[];
  games: WhatIfGame[];
  metadata: WhatIfMetadata;
}

const mapTeamResult = (team: BackendTeamResult): WhatIfTeamResult => {
  const result: WhatIfTeamResult = {
    team_id: team.team_id || team.teamid || 0,
    team_name: team.team_name,
    conference: team.conference,
    logo_url: team.logo_url || "",
    avg_projected_conf_wins: team.avg_projected_conf_wins || 0,
    avg_conference_standing: team.avg_conference_standing || 0,
    standing_1_prob: team.standing_1_prob,
    standing_2_prob: team.standing_2_prob,
    standing_3_prob: team.standing_3_prob,
    standing_4_prob: team.standing_4_prob,
    standing_5_prob: team.standing_5_prob,
    standing_6_prob: team.standing_6_prob,
    standing_7_prob: team.standing_7_prob,
    standing_8_prob: team.standing_8_prob,
  };
  return result;
};

const calculateBasketballWhatIf = async (
  request: WhatIfRequest
): Promise<WhatIfResponse> => {
  console.log("ðŸ€ Sending basketball what-if request:", request);

  const response = await fetch("/api/proxy/basketball/whatif", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    interface ErrorResponse {
      error: string;
    }
    const errorData = (await response.json()) as ErrorResponse;
    console.error("âŒ Basketball what-if API error:", errorData);
    throw new Error(
      errorData.error || "Failed to calculate basketball what-if scenarios"
    );
  }

  const data = (await response.json()) as BackendWhatIfResponse;
  console.log("ðŸ“¥ Received basketball what-if response:", {
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
      num_conference_games: 0,
      num_current_projections: 0,
    },
  };

  console.log("âœ… Mapped basketball what-if data:", {
    teams: mappedData.data.length,
    games: mappedData.games.length,
    current_projections: mappedData.current_projections.length,
  });

  return mappedData;
};

export const useBasketballWhatIf = () => {
  return useMutation<WhatIfResponse, Error, WhatIfRequest>({
    mutationFn: calculateBasketballWhatIf,
  });
};
