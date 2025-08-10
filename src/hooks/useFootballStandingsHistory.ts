// src/hooks/useFootballStandingsHistory.ts
import { useQuery } from "@tanstack/react-query";

export const useFootballStandingsHistory = (conference: string) => {
  return useQuery({
    queryKey: ["football-standings-history", conference],
    queryFn: async () => {
      const response = await fetch(
        `/api/proxy/football/standings/${conference}/history`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch standings history");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
