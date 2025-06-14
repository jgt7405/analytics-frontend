// src/hooks/useCWV.ts
import { api } from "@/services/api";
import { CWVApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";

export const useCWV = (conference: string) => {
  return useQuery<CWVApiResponse, Error>({
    queryKey: ["cwv", conference],
    queryFn: () => api.getCWV(conference),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
