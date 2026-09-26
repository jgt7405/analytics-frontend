import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

// One team's row from /basketball/conf_champ_analysis/<conference>: conference
// tournament round odds and the wins needed for each NCAA seed line.
export interface ConfChampAnalysisRow {
  team_name: string;
  actual_total_wins?: number;
  actual_total_losses?: number;
  proj_losses?: number;
  pct_prob_win_conf_tourney_game_1: number;
  pct_prob_win_conf_tourney_game_2: number;
  pct_prob_win_conf_tourney_game_3: number;
  pct_prob_win_conf_tourney_game_4: number;
  pct_prob_win_conf_tourney_game_5: number;
  pct_prob_win_conf_tourney_game_6: number;
  wins_for_bubble: number;
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
  season_total_proj_wins_avg: number;
}

export interface ConfChampAnalysisResponse {
  data?: ConfChampAnalysisRow[];
}

const fetchConfChampAnalysis = async (
  conference: string,
): Promise<ConfChampAnalysisResponse> => {
  const confFormatted = conference.replace(/\s+/g, "_");
  const response = await fetch(apiUrl("basketball.confChampAnalysis", { conference: confFormatted }));
  if (!response.ok) throw new Error(`Failed to fetch conference analysis: ${response.status}`);
  return response.json();
};

/** Current-season conference championship analysis for every team in a
 *  conference. (useBasketballSeedWinsData reads the same endpoint with a
 *  season and maps it for the seed-wins chart.) */
export const useBasketballConfChampAnalysis = (conference: string) =>
  useQuery({
    queryKey: queryKeys.basketball.confChampAnalysis(conference),
    queryFn: () => fetchConfChampAnalysis(conference),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
  });
