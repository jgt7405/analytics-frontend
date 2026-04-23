// src/hooks/useFootballTeams.ts
import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useFootballTeams = (season?: string) => {
  return useQuery<any, Error>({
    queryKey: ["football-teams-debug", season],
    queryFn: async () => {
      console.log("🏈 Fetching football teams...", season);
      const result = await api.getFootballTeams(season);
      console.log("🏈 Football teams API response:", result);
      console.log("🏈 First team data:", result?.data?.[0]);
      console.log(
        "🏈 Alabama data:",
        result?.data?.find((t: any) => t.team_name === "Alabama"),
      );
      return result;
    },
    staleTime: 0, // Disable cache for debugging
    retry: 3,
  });
};