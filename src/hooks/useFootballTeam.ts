// src/hooks/useFootballTeam.ts
import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useFootballTeam = (teamName: string) => {
  return useQuery<any, Error>({
    queryKey: ["football-team", teamName],
    queryFn: () => api.getFootballTeam(teamName),
    enabled: !!teamName,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
