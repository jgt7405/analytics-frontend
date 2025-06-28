// src/hooks/useFootballConfData.ts
import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useFootballConfData = () => {
  return useQuery<any, Error>({
    queryKey: ["football-conf-data"],
    queryFn: () => api.getFootballConfData(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
