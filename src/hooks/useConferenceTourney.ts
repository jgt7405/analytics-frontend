import { api } from "@/services/api";
import type { ConfTourneyApiResponse } from "@/services/basketball-api";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useConferenceTourney = (
  conference: string,
  season?: string,
  initialData?: ConfTourneyApiResponse,
) => {
  return useQuery<ConfTourneyApiResponse, Error>({
    queryKey: queryKeys.basketball.confTourney(conference, season),
    initialData,
    // The server copy can be a stale cache hit (Next serves an expired entry
    // once while it revalidates), so refetch on mount rather than trust it.
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => api.getConfTourney(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};