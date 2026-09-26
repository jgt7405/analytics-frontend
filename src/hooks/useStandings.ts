import { api } from "@/services/api";
import { StandingsApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";
import { logger } from "@/lib/logger";

export const useStandings = (
  conference: string,
  season?: string,
  initialData?: StandingsApiResponse,
) => {
  return useQuery<StandingsApiResponse, Error>({
    queryKey: queryKeys.basketball.standings(conference, season),
    initialData,
    queryFn: async () => {
      logger.debug("Fetching standings for:", conference, season);
      try {
        const result = await api.getStandings(conference, season);  // ✅ FIXED: Added season
        logger.debug("Standings API success:", result);
        return result;
      } catch (error) {
        logger.error("Standings API error:", error);
        throw error;
      }
    },
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};