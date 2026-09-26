import { api } from "@/services/api";
import type { ConfTourneyApiResponse } from "@/services/basketball-api";
import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";

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
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};