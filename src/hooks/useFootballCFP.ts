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
    queryFn: () => api.getCFP(conference, season),
    enabled: enabled && !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};