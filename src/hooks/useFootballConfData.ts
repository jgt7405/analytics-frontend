// src/hooks/useFootballConfData.ts
import { api } from "@/services/api";
import { FootballConferenceApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useFootballConfData = (season?: string, initialData?: FootballConferenceApiResponse) => {
  return useQuery<FootballConferenceApiResponse, Error>({
    queryKey: queryKeys.football.confData(season),
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => api.getFootballConfData(season),
    ...queryCachePolicy("currentStandings"),
    retry: 3,
    refetchOnWindowFocus: false,
  });
};