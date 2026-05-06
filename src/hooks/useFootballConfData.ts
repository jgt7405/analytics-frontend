// src/hooks/useFootballConfData.ts
import { api } from "@/services/api";
import { FootballConferenceApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export const useFootballConfData = (season?: string) => {
  return useQuery<FootballConferenceApiResponse, Error>({
    queryKey: ["football-conf-data-proxy-fixed", season],
    queryFn: () => api.getFootballConfData(season),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    refetchOnWindowFocus: false,
  });
};