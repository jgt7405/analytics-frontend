// src/hooks/useFootballCFP.ts
import { api } from "@/services/api";
import { FootballCFPApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useFootballCFP = (
  conference: string,
  season?: string,
  initialData?: FootballCFPApiResponse,
  enabled: boolean = true,
) => {
  return useQuery<FootballCFPApiResponse, Error>({
    queryKey: queryKeys.football.cfp(conference, season),
    initialData,
    // The server copy can be a stale cache hit (Next serves an expired entry
    // once while it revalidates), so refetch on mount rather than trust it.
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => api.getCFP(conference, season),
    enabled: enabled && !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};