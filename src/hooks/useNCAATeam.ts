// src/hooks/useNCAATeam.ts
import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useNCAATeam = (conference: string) => {
  return useQuery({
    queryKey: ["ncaa-tourney", conference],
    queryFn: () => api.getNCAATourney(conference),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
