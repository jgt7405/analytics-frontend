// src/hooks/useFootballCWV.ts
import { api } from "@/services/api";
import { FootballCWVApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export function useFootballCWV(conference: string, season?: string) {
  return useQuery<FootballCWVApiResponse>({
    queryKey: ["football-cwv", conference, season],
    queryFn: async () => {
      return api.getFootballCWV(conference, season);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}