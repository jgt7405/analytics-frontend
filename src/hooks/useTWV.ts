// src/hooks/useTWV.ts
import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useTWV = (conference: string) => {
  return useQuery<any, Error>({
    queryKey: ["twv", conference],
    queryFn: () => api.getTWV(conference),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
