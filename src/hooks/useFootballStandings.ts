// src/hooks/useFootballStandings.ts
import { api } from "@/services/api";
import { FootballStandingsApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";
import { logger } from "@/lib/logger";

export const useFootballStandings = (
  conference: string,
  season?: string,
  initialData?: FootballStandingsApiResponse,
) => {
  return useQuery<FootballStandingsApiResponse, Error>({
    queryKey: queryKeys.football.standings(conference, season),
    initialData,
    queryFn: async () => {
      logger.debug("Fetching football standings for:", conference, season);
      try {
        const result = await api.getFootballStandings(conference, season);
        logger.debug("Football standings API success:", result);
        return result;
      } catch (error) {
        logger.error("Football standings API error:", error);
        throw error;
      }
    },
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};