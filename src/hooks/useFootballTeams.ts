// src/hooks/useFootballTeams.ts
import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useFootballTeams = (season?: string) => {
  return useQuery<any, Error>({
    queryKey: ["football-teams", season],
    queryFn: () => api.getFootballTeams(season),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
  });
};