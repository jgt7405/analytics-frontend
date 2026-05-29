// src/hooks/useFootballSeed.ts
import { api } from "@/services/api";
import type { FootballSeedApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export const useFootballSeed = (
  conference: string,
  season?: string,
  initialData?: FootballSeedApiResponse,
) => {
  return useQuery<FootballSeedApiResponse, Error>({
    queryKey: ["football-seed", conference, season],
    initialData,
    queryFn: () => api.getFootballSeed(conference, season),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};