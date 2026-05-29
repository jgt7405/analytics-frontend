import { api } from "@/services/api";
import type { ConfTourneyApiResponse } from "@/services/basketball-api";
import { useQuery } from "@tanstack/react-query";

export const useConferenceTourney = (
  conference: string,
  season?: string,
  initialData?: ConfTourneyApiResponse,
) => {
  return useQuery<ConfTourneyApiResponse, Error>({
    queryKey: ["conf-tourney", conference, season],
    initialData,
    queryFn: () => api.getConfTourney(conference, season),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};