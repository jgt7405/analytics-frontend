// src/hooks/useFootballSeed.ts
import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useFootballSeed = (conference: string, season?: string) => {
  return useQuery<any, Error>({
    queryKey: ["football-seed", conference, season],
    queryFn: () => api.getFootballSeed(conference, season),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};