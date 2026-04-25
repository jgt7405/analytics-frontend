import { api } from "@/services/api";
import { StandingsApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";

export const useStandings = (conference: string, season?: string) => {
  return useQuery<StandingsApiResponse, Error>({
    queryKey: ["standings", conference, season],
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
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};