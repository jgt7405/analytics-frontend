// src/hooks/useFootballCFP.ts
import { api } from "@/services/api";
import { FootballCFPApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export const useFootballCFP = (
  conference: string,
  season?: string,
  initialData?: FootballCFPApiResponse,
  enabled: boolean = true,
) => {
  return useQuery<FootballCFPApiResponse, Error>({
    queryKey: ["football-cfp", conference, season],
    initialData,
    queryFn: () => api.getCFP(conference, season),
    enabled: enabled && !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};