import { PlayoffRankingsResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export type PlayoffRankingsMode = "season" | "current";

export function useFootballPlayoffRankings(
  season?: string,
  mode: PlayoffRankingsMode = "season",
) {
  return useQuery<PlayoffRankingsResponse>({
    queryKey: ["football-playoff-rankings", season, mode],
    queryFn: async () => {
      // Use proxy pattern consistent with other football hooks
      const params = new URLSearchParams();
      if (season) params.set("season", season);
      if (mode === "current") params.set("mode", "current");
      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(
        `/api/proxy/football/playoff_rankings/All_Teams${query}`,
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