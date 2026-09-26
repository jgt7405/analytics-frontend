// src/hooks/useFootballTeams.ts
import { api } from "@/services/api";
import type { FootballTeamsApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useFootballTeams = (season?: string) => {
  return useQuery<FootballTeamsApiResponse, Error>({
    queryKey: ["football-teams", season],
    queryFn: () => api.getFootballTeams(season),
    ...queryCachePolicy("referenceData"),
    retry: 3,
  });
};