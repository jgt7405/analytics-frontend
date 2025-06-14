import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useConferenceTourney = (conference: string) => {
  return useQuery<any, Error>({
    queryKey: ["conf-tourney", conference],
    queryFn: () => api.getConfTourney(conference),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
