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
  home_logo_url?: string;
  away_logo_url?: string;
  home_team_logo?: string;
  away_team_logo?: string;
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

export interface ScenarioGameResult {
  game_id: number;
  date: string;
  away_team: string;
  home_team: string;
  away_team_id: number;
  home_team_id: number;
  winner: string;
  winner_id: number;
  loser: string;
  loser_id: number;
}

export interface ScenarioTeamStanding {
  team_id: number;
  team_name: string;
  conf_wins: number;
  conf_losses: number;
  seed: number;
}

export interface ScenarioResult {
  scenario_num: number;
  games: ScenarioGameResult[];
  game_outcomes: Record<number, [string, string]>;
  standings: ScenarioTeamStanding[];
}

export interface WhatIfResponse {
  data_with_ties: WhatIfTeamResult[];
  data_no_ties: WhatIfTeamResult[];
  current_projections_with_ties: WhatIfTeamResult[];
  current_projections_no_ties: WhatIfTeamResult[];
  games: WhatIfGame[];
  scenario_results: ScenarioResult[];
  conference: string;
  num_scenarios: number;
  num_conference_games: number;
  num_current_projections: number;
  calculation_time: number;
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

interface BackendGame {
  game_id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_team_id: number;
  away_team_id: number;
  home_probability: number;
  away_probability: number;
  conf_game: boolean;
  home_team_logo?: string;
  away_team_logo?: string;
  home_logo_url?: string;
  away_logo_url?: string;
}

interface BackendWhatIfResponse {
  data_with_ties: BackendTeamResult[];
  data_no_ties: BackendTeamResult[];
  current_projections_with_ties: BackendTeamResult[];
  current_projections_no_ties: BackendTeamResult[];
  games: BackendGame[];
  scenario_results: ScenarioResult[];
  conference: string;
  num_scenarios: number;
  num_conference_games: number;
  num_current_projections: number;
  calculation_time: number;
}

const mapTeamResult = (team: BackendTeamResult): WhatIfTeamResult => {
  return {
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
};

const mapGame = (game: BackendGame): WhatIfGame => {
  // Convert filename to frontend logo path
  const getLogoUrl = (filename: string | undefined): string | undefined => {
    if (!filename) return undefined;
    // If it's already a full URL, use as-is
    if (filename.startsWith("http")) return filename;
    // If it's a filename, construct the public path
    return `/images/team_logos/${filename}`;
  };

  return {
    game_id: game.game_id,
    date: game.date,
    home_team: game.home_team,
    away_team: game.away_team,
    home_team_id: game.home_team_id,
    away_team_id: game.away_team_id,
    home_probability: game.home_probability,
    away_probability: game.away_probability,
    conf_game: game.conf_game,
    home_logo_url: getLogoUrl(game.home_team_logo || game.home_logo_url),
    away_logo_url: getLogoUrl(game.away_team_logo || game.away_logo_url),
  };
};

const calculateBasketballWhatIf = async (
  request: WhatIfRequest,
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
    console.error("âš ï¸ Basketball what-if API error:", errorData);
    throw new Error(
      errorData.error || "Failed to calculate basketball what-if scenarios",
    );
  }

  const data = (await response.json()) as BackendWhatIfResponse;

  console.log("========================================");
  console.log("RAW API RESPONSE - DUAL SECTIONS");
  console.log("========================================");

  // Log data availability
  console.log("Response fields available:");
  console.log(
    "  âœ… data_with_ties:",
    data.data_with_ties?.length || 0,
    "teams",
  );
  console.log("  âœ… data_no_ties:", data.data_no_ties?.length || 0, "teams");
  console.log(
    "  âœ… current_projections_with_ties:",
    data.current_projections_with_ties?.length || 0,
    "teams",
  );
  console.log(
    "  âœ… current_projections_no_ties:",
    data.current_projections_no_ties?.length || 0,
    "teams",
  );
  console.log("  âœ… games:", data.games?.length || 0, "games");
  console.log(
    "  âœ… scenario_results:",
    data.scenario_results?.length || 0,
    "scenarios",
  );

  // Log sample data
  if (data.data_with_ties && data.data_with_ties.length > 0) {
    const first = data.data_with_ties[0];
    console.log("\nFirst team (WITH TIES):", {
      name: first.team_name,
      standing_1_prob: first.standing_1_prob,
      standing_2_prob: first.standing_2_prob,
    });
  }

  if (data.games && data.games.length > 0) {
    const first = data.games[0];
    console.log("\nFirst game:", {
      id: first.game_id,
      matchup: `${first.away_team} @ ${first.home_team}`,
      away_prob: first.away_probability,
      home_prob: first.home_probability,
      has_home_logo: !!(first.home_team_logo || first.home_logo_url),
      has_away_logo: !!(first.away_team_logo || first.away_logo_url),
    });
  }

  console.log("========================================");

  // Map the backend response to the frontend format
  const mappedData: WhatIfResponse = {
    data_with_ties: (data.data_with_ties || []).map(mapTeamResult),
    data_no_ties: (data.data_no_ties || []).map(mapTeamResult),
    current_projections_with_ties: (
      data.current_projections_with_ties || []
    ).map(mapTeamResult),
    current_projections_no_ties: (data.current_projections_no_ties || []).map(
      mapTeamResult,
    ),
    games: (data.games || []).map(mapGame),
    scenario_results: data.scenario_results || [],
    conference: data.conference,
    num_scenarios: data.num_scenarios,
    num_conference_games: data.num_conference_games,
    num_current_projections: data.num_current_projections,
    calculation_time: data.calculation_time,
  };

  console.log("âœ… Mapped data ready:", {
    with_ties_teams: mappedData.data_with_ties.length,
    no_ties_teams: mappedData.data_no_ties.length,
    games: mappedData.games.length,
  });

  return mappedData;
};

export const useBasketballWhatIf = () => {
  return useMutation<WhatIfResponse, Error, WhatIfRequest>({
    mutationFn: calculateBasketballWhatIf,
  });
};
