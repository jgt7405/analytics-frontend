// src/hooks/useFootballConfData.ts
import { api } from "@/services/api";
import { FootballConferenceApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export const useFootballConfData = (season?: string) => {
  return useQuery<FootballConferenceApiResponse, Error>({
    queryKey: ["football-conf-data-proxy-fixed", season],
    queryFn: () => api.getFootballConfData(season),
    staleTime: 0,
    gcTime: 0,
    retry: 3,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};