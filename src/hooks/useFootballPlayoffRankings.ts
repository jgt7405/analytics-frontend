import { PlayoffRankingsResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export function useFootballPlayoffRankings() {
  return useQuery<PlayoffRankingsResponse>({
    queryKey: ["football-playoff-rankings"],
    queryFn: async () => {
      // Use proxy pattern consistent with other football hooks
      const response = await fetch(
        "/api/proxy/football/playoff_rankings/All_Teams"
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
