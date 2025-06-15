import { api } from "@/services/api";
import { NCAATeamApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";

export const useNCAATeam = (conference: string) => {
  return useQuery<NCAATeamApiResponse, Error>({
    queryKey: ["ncaa-tourney", conference],
    queryFn: () => api.getNCCATourney(conference),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
