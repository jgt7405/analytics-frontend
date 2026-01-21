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
  success: boolean;
  data: BackendTeamResult[];
  current_projections: BackendTeamResult[];
  games: BackendGame[];
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
    home_logo_url: getLogoUrl(game.home_team_logo),
    away_logo_url: getLogoUrl(game.away_team_logo),
  };
};

const calculateBasketballWhatIf = async (
  request: WhatIfRequest,
): Promise<WhatIfResponse> => {
  console.log("🏀 Sending basketball what-if request:", request);

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
    console.error("⚠️ Basketball what-if API error:", errorData);
    throw new Error(
      errorData.error || "Failed to calculate basketball what-if scenarios",
    );
  }

  const data = (await response.json()) as BackendWhatIfResponse;
  console.log("📊 Received basketball what-if response:", {
    success: data.success,
    teams: data.data?.length || 0,
    games: data.games?.length || 0,
    current_projections: data.current_projections?.length || 0,
    metadata: data.metadata,
  });

  // Debug: Inspect actual game objects
  if (data.games && data.games.length > 0) {
    console.log("🔍 DEBUGGING: First 3 games from API:");
    for (let i = 0; i < Math.min(3, data.games.length); i++) {
      const game = data.games[i];
      const gameRecord = game as unknown as Record<string, unknown>;
      console.log(`  Game ${i}:`, {
        game_id: game.game_id,
        home_team: game.home_team,
        away_team: game.away_team,
        home_team_logo: gameRecord.home_team_logo,
        away_team_logo: gameRecord.away_team_logo,
        home_logo_url: gameRecord.home_logo_url,
        away_logo_url: gameRecord.away_logo_url,
        allKeys: Object.keys(game),
      });
    }
  }

  // Analyze game logo data
  if (data.games && data.games.length > 0) {
    console.log("🔍 DEBUGGING: Analyzing logo availability...");

    const gamesWithBothLogos = data.games.filter((g) => {
      const gRecord = g as unknown as Record<string, unknown>;
      const hasHome = !!(g.home_logo_url || gRecord.home_team_logo);
      const hasAway = !!(g.away_logo_url || gRecord.away_team_logo);
      return hasHome && hasAway;
    }).length;

    const totalGames = data.games.length;
    console.log(
      `📸 Logo Analysis: ${gamesWithBothLogos}/${totalGames} games have both logos`,
    );

    // Show which field names have data
    const firstGame = data.games[0];
    const firstGameRecord = firstGame as unknown as Record<string, unknown>;
    console.log("🔍 Field name check on first game:", {
      has_home_logo_url: !!firstGame.home_logo_url,
      has_away_logo_url: !!firstGame.away_logo_url,
      has_home_team_logo: !!firstGameRecord.home_team_logo,
      has_away_team_logo: !!firstGameRecord.away_team_logo,
    });

    if (gamesWithBothLogos < totalGames) {
      const missingLogos = data.games
        .filter((g) => {
          const gRecord = g as unknown as Record<string, unknown>;
          return (
            !(g.home_logo_url || gRecord.home_team_logo) ||
            !(g.away_logo_url || gRecord.away_team_logo)
          );
        })
        .slice(0, 3)
        .map((g) => {
          const gRecord = g as unknown as Record<string, unknown>;
          return {
            game_id: g.game_id,
            game: `${g.home_team} vs ${g.away_team}`,
            homeLogoMissing: !(g.home_logo_url || gRecord.home_team_logo),
            awayLogoMissing: !(g.away_logo_url || gRecord.away_team_logo),
            homeLogoUrl: g.home_logo_url,
            homeTeamLogo: gRecord.home_team_logo,
            awayLogoUrl: g.away_logo_url,
            awayTeamLogo: gRecord.away_team_logo,
            home_team_id: g.home_team_id,
            away_team_id: g.away_team_id,
          };
        });
      console.warn("⚠️ Some games missing logos:", missingLogos);
      console.log("🔍 Total games:", totalGames);
      console.log("🔍 Games with logos:", gamesWithBothLogos);
      console.log("🔍 Games without logos:", totalGames - gamesWithBothLogos);
    }
  }

  // Map the backend response to the frontend format
  const mappedData: WhatIfResponse = {
    success: data.success,
    data: (data.data || []).map(mapTeamResult),
    current_projections: (data.current_projections || []).map(mapTeamResult),
    games: (data.games || []).map(mapGame),
    metadata: data.metadata || {
      conference: request.conference,
      num_scenarios: 1000,
      calculation_time: 0,
      num_selections: request.selections.length,
      num_conference_games: 0,
      num_current_projections: 0,
    },
  };

  // Debug: Show mapped games with logo URLs
  if (mappedData.games && mappedData.games.length > 0) {
    console.log("🔍 DEBUGGING: First 3 MAPPED games (after mapGame):");
    for (let i = 0; i < Math.min(3, mappedData.games.length); i++) {
      const game = mappedData.games[i];
      console.log(`  Game ${i}:`, {
        game_id: game.game_id,
        home_team: game.home_team,
        away_team: game.away_team,
        home_logo_url: game.home_logo_url,
        away_logo_url: game.away_logo_url,
        home_logo_truthy: !!game.home_logo_url,
        away_logo_truthy: !!game.away_logo_url,
      });
    }
  }

  console.log("✅ Mapped basketball what-if data:", {
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
