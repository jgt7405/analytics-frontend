// src/hooks/useFootballSeed.ts
import { api } from "@/services/api";
import type { FootballSeedApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useFootballSeed = (
  conference: string,
  season?: string,
  initialData?: FootballSeedApiResponse,
) => {
  return useQuery<FootballSeedApiResponse, Error>({
    queryKey: queryKeys.football.seed(conference, season),
    initialData,
    // The server copy can be a stale cache hit (Next serves an expired entry
    // once while it revalidates), so refetch on mount rather than trust it.
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => api.getFootballSeed(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};