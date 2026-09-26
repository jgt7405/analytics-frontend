// src/hooks/useFootballCWV.ts
import { api } from "@/services/api";
import { FootballCWVApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";

export function useFootballCWV(
  conference: string,
  season?: string,
  initialData?: FootballCWVApiResponse,
) {
  return useQuery<FootballCWVApiResponse>({
    queryKey: ["football-cwv", conference, season],
    initialData,
    queryFn: async () => {
      return api.getFootballCWV(conference, season);
    },
    ...queryCachePolicy("currentStandings"),
  });
}