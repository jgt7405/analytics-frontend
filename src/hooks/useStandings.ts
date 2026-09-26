import { api } from "@/services/api";
import { StandingsApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useStandings = (
  conference: string,
  season?: string,
  initialData?: StandingsApiResponse,
) => {
  return useQuery<StandingsApiResponse, Error>({
    queryKey: queryKeys.basketball.standings(conference, season),
    initialData,
    queryFn: async () => {
      console.log("Fetching standings for:", conference, season);
      try {
        const result = await api.getStandings(conference, season);  // ✅ FIXED: Added season
        console.log("Standings API success:", result);
        return result;
      } catch (error) {
        console.error("Standings API error:", error);
        throw error;
      }
    },
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};