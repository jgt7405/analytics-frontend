import { api } from "@/services/api";
import { StandingsApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";

export const useStandings = (conference: string) => {
  return useQuery<StandingsApiResponse, Error>({
    queryKey: ["standings", conference],
    queryFn: async () => {
      console.log("Fetching standings for:", conference);
      try {
        const result = await api.getStandings(conference);
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
