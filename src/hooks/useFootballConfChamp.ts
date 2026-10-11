// src/hooks/useFootballConfChamp.ts
import { api } from "@/services/api";
import { FootballConfChampApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useFootballConfChamp = (
  conference: string,
  season?: string,
  initialData?: FootballConfChampApiResponse,
) => {
  return useQuery<FootballConfChampApiResponse, Error>({
    queryKey: queryKeys.football.confChamp(conference, season),
    initialData,
    // The server copy can be a stale cache hit (Next serves an expired entry
    // once while it revalidates), so refetch on mount rather than trust it.
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => api.getFootballConfChamp(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};