import { PlayoffRankingsResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

export type PlayoffRankingsMode = "season" | "current";

export function useFootballPlayoffRankings(
  season?: string,
  mode: PlayoffRankingsMode = "season",
  initialData?: PlayoffRankingsResponse,
) {
  return useQuery<PlayoffRankingsResponse>({
    queryKey: queryKeys.football.playoffRankings(season, mode),
    initialData: mode === "season" && !season ? initialData : undefined,
    initialDataUpdatedAt: initialData && mode === "season" && !season ? 0 : undefined,
    queryFn: async () => {
      const response = await fetch(
        apiUrl("football.playoffRankings", {}, {
          season,
          mode: mode === "current" ? "current" : undefined,
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