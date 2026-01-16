// src/hooks/useBasketballSeedWinsData.ts
import { useQuery } from "@tanstack/react-query";

export interface SeedWinsTeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  actual_total_wins: number;
  actual_total_losses: number;
  total_possible_pre_ncaa_games: number;
  wins_for_1_seed: number;
  wins_for_2_seed: number;
  wins_for_3_seed: number;
  wins_for_4_seed: number;
  wins_for_5_seed: number;
  wins_for_6_seed: number;
  wins_for_7_seed: number;
  wins_for_8_seed: number;
  wins_for_9_seed: number;
  wins_for_10_seed: number;
  wins_for_11_seed: number;
  wins_for_bubble: number;
  wins_probabilities?: Record<string, number>;
  pct_prob_win_conf_tourney_game_1?: number;
  pct_prob_win_conf_tourney_game_2?: number;
  pct_prob_win_conf_tourney_game_3?: number;
  pct_prob_win_conf_tourney_game_4?: number;
  pct_prob_win_conf_tourney_game_5?: number;
  pct_prob_win_conf_tourney_game_6?: number;
  season_total_proj_wins_avg?: number;
}

export interface SeedWinsResponse {
  data: SeedWinsTeam[];
  conference: string;
}

/**
 * Fetch seed wins data for a given conference or all teams
 * Used by BballSeedWinsRequired component and related visualizations
 *
 * @param conference - Conference name or "All Teams"
 * @returns Query result with seed wins data array
 */
export const useBasketballSeedWinsData = (conference: string | null) => {
  return useQuery<SeedWinsResponse, Error>({
    queryKey: ["basketball-seed-wins-data", conference],
    queryFn: async () => {
      if (!conference) {
        throw new Error("Conference is required");
      }

      // Convert "All Teams" to "All_Teams" for API
      const confFormatted =
        conference === "All Teams"
          ? "All_Teams"
          : conference.replace(/\s+/g, "_");

      try {
        const response = await fetch(
          `/api/proxy/basketball/conf_champ_analysis/${confFormatted}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[SeedWinsData] API Error - ${confFormatted}:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
          throw new Error(
            `HTTP ${response.status}: Failed to fetch seed wins data for ${conference}`
          );
        }

        const result = await response.json();

        if (!result.data || !Array.isArray(result.data)) {
          console.error("[SeedWinsData] Invalid response format:", result);
          throw new Error("Invalid response format: expected data array");
        }

        // Map API response to our interface
        const mappedData: SeedWinsTeam[] = result.data.map(
          (team: Record<string, unknown>) => {
            const actualWins = Number(team.actual_total_wins) || 0;
            const actualLosses = Number(team.actual_total_losses) || 0;
            const projWins = Number(team.season_total_proj_wins_avg) || 0;
            const projLosses =
              Number(team.proj_losses) ||
              Number(team.pre_ncaa_proj_losses) ||
              0;

            // Calculate total possible games: actual games played + projected remaining games
            // If not available, estimate from projected wins/losses
            const totalPossible =
              Number(team.total_possible_pre_ncaa_games) ||
              (actualWins + actualLosses > 0
                ? actualWins +
                  actualLosses +
                  (projWins + projLosses - (actualWins + actualLosses))
                : projWins + projLosses) ||
              130; // Conservative estimate for full season

            return {
              team_name: String(team.team_name || ""),
              team_id: String(team.team_id || team.teamid || ""),
              logo_url: String(
                team.logo_url || `/images/team_logos/${team.team_name}.png`
              ),
              actual_total_wins: actualWins,
              actual_total_losses: actualLosses,
              total_possible_pre_ncaa_games: totalPossible,
              wins_for_1_seed: Number(team.wins_for_1_seed) || 0,
              wins_for_2_seed: Number(team.wins_for_2_seed) || 0,
              wins_for_3_seed: Number(team.wins_for_3_seed) || 0,
              wins_for_4_seed: Number(team.wins_for_4_seed) || 0,
              wins_for_5_seed: Number(team.wins_for_5_seed) || 0,
              wins_for_6_seed: Number(team.wins_for_6_seed) || 0,
              wins_for_7_seed: Number(team.wins_for_7_seed) || 0,
              wins_for_8_seed: Number(team.wins_for_8_seed) || 0,
              wins_for_9_seed: Number(team.wins_for_9_seed) || 0,
              wins_for_10_seed: Number(team.wins_for_10_seed) || 0,
              wins_for_11_seed: Number(team.wins_for_11_seed) || 0,
              wins_for_bubble: Number(team.wins_for_bubble) || 0,
              wins_probabilities: (team.wins_probabilities as Record<
                string,
                number
              >) || {
                "1": 0,
                "2": 0,
                "3": 0,
                "4": 0,
                "5": 0,
                "6": 0,
                "7": 0,
                "8": 0,
                "9": 0,
                "10": 0,
                "11": 0,
                bubble: 0,
              },
              pct_prob_win_conf_tourney_game_1:
                Number(team.pct_prob_win_conf_tourney_game_1) || 0,
              pct_prob_win_conf_tourney_game_2:
                Number(team.pct_prob_win_conf_tourney_game_2) || 0,
              pct_prob_win_conf_tourney_game_3:
                Number(team.pct_prob_win_conf_tourney_game_3) || 0,
              pct_prob_win_conf_tourney_game_4:
                Number(team.pct_prob_win_conf_tourney_game_4) || 0,
              pct_prob_win_conf_tourney_game_5:
                Number(team.pct_prob_win_conf_tourney_game_5) || 0,
              pct_prob_win_conf_tourney_game_6:
                Number(team.pct_prob_win_conf_tourney_game_6) || 0,
              season_total_proj_wins_avg:
                Number(team.season_total_proj_wins_avg) || 0,
            };
          }
        );

        console.log(
          `[SeedWinsData] Successfully loaded ${mappedData.length} teams for ${conference}`
        );

        return {
          data: mappedData,
          conference: conference,
        };
      } catch (error) {
        console.error(
          `[SeedWinsData] Error fetching for ${conference}:`,
          error
        );
        throw error;
      }
    },
    enabled: !!conference,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};
