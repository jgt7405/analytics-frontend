// src/hooks/useFootballCWV.ts
import { api } from "@/services/api";
import { FootballCWVApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export function useFootballCWV(conference: string) {
  return useQuery<FootballCWVApiResponse>({
    queryKey: ["football-cwv", conference],
    queryFn: async () => {
      return api.getFootballCWV(conference);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
