import { PlayoffRankingsResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

export type PlayoffRankingsMode = "season" | "current";

// How the CFP order is built: which TWV the blend uses and its share
// (rating gets the rest). The default is the real CFP formula; the home
// page lets visitors try others.
export interface CFPRankingOptions {
  metric: "cfp" | "twv12";
  twvWeight: number;
}

export const DEFAULT_CFP_RANKING: CFPRankingOptions = { metric: "cfp", twvWeight: 80 };

export const isDefaultCFPRanking = (ranking: CFPRankingOptions) =>
  ranking.metric === DEFAULT_CFP_RANKING.metric &&
  ranking.twvWeight === DEFAULT_CFP_RANKING.twvWeight;

export function useFootballPlayoffRankings(
  season?: string,
  mode: PlayoffRankingsMode = "season",
  initialData?: PlayoffRankingsResponse,
  ranking: CFPRankingOptions = DEFAULT_CFP_RANKING,
) {
  const isDefault = isDefaultCFPRanking(ranking);
  // The server-rendered initialData is the default season view only
  const useInitial = mode === "season" && !season && isDefault;
  return useQuery<PlayoffRankingsResponse>({
    queryKey: queryKeys.football.playoffRankings(
      season,
      mode,
      ranking.metric,
      ranking.twvWeight,
    ),
    initialData: useInitial ? initialData : undefined,
    initialDataUpdatedAt: initialData && useInitial ? 0 : undefined,
    queryFn: async () => {
      const response = await fetch(
        apiUrl("football.playoffRankings", {}, {
          season,
          mode: mode === "current" ? "current" : undefined,
          // Defaults are left off so the default view keeps one URL
          metric: isDefault ? undefined : ranking.metric,
          twv_weight: isDefault ? undefined : String(ranking.twvWeight),
        }),
      );
      if (!response.ok) {
        throw new Error("Failed to fetch playoff rankings");
      }
      return response.json();
    },
    ...queryCachePolicy("currentStandings"),
    refetchOnWindowFocus: false,
  });
}
