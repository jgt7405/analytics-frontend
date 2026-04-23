// src/hooks/useFootballStandings.ts
import { api } from "@/services/api";
import { FootballStandingsApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export const useFootballStandings = (conference: string, season?: string) => {
  return useQuery<FootballStandingsApiResponse, Error>({
    queryKey: ["football-standings", conference, season],
    queryFn: async () => {
      console.log("Fetching football standings for:", conference, season);
      try {
        const result = await api.getFootballStandings(conference, season);
        console.log("Football standings API success:", result);
        return result;
      } catch (error) {
        console.error("Football standings API error:", error);
        throw error;
      }
    },
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};