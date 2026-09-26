// src/hooks/useFootballStandings.ts
import { api } from "@/services/api";
import { FootballStandingsApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useFootballStandings = (
  conference: string,
  season?: string,
  initialData?: FootballStandingsApiResponse,
) => {
  return useQuery<FootballStandingsApiResponse, Error>({
    queryKey: queryKeys.football.standings(conference, season),
    initialData,
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
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};