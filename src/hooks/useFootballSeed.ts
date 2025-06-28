// src/hooks/useFootballSeed.ts
import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useFootballSeed = (conference: string) => {
  return useQuery<any, Error>({
    queryKey: ["football-seed", conference],
    queryFn: () => api.getFootballSeed(conference),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
