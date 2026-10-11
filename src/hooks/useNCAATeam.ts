// src/hooks/useNCAATeam.ts
import { api } from "@/services/api";
import type { NCAATeamApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useNCAATeam = (
  conference: string,
  season?: string,
  initialData?: NCAATeamApiResponse,
) => {
  return useQuery({
    queryKey: queryKeys.basketball.ncaaTourney(conference, season),
    initialData,
    // The server copy can be a stale cache hit (Next serves an expired entry
    // once while it revalidates), so refetch on mount rather than trust it.
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => api.getNCAATourney(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};