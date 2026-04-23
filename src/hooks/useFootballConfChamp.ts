// src/hooks/useFootballConfChamp.ts
import { api } from "@/services/api";
import { FootballConfChampApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export const useFootballConfChamp = (
  conference: string,
  season?: string,
) => {
  return useQuery<FootballConfChampApiResponse, Error>({
    queryKey: ["football-conf-champ", conference, season],
    queryFn: () => api.getFootballConfChamp(conference, season),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
};