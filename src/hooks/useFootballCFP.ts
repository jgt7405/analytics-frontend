// src/hooks/useFootballCFP.ts
import { api } from "@/services/api";
import { FootballCFPApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export const useFootballCFP = (conference: string, season?: string) => {
  return useQuery<FootballCFPApiResponse, Error>({
    queryKey: ["football-cfp", conference, season],
    queryFn: () => api.getCFP(conference, season),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};