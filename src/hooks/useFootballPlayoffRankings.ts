import { PlayoffRankingsResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export function useFootballPlayoffRankings(season?: string) {
  return useQuery<PlayoffRankingsResponse>({
    queryKey: ["football-playoff-rankings", season],
    queryFn: async () => {
      // Use proxy pattern consistent with other football hooks
      const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
      const response = await fetch(
        `/api/proxy/football/playoff_rankings/All_Teams${seasonQuery}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch playoff rankings");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}