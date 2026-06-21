import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useTWV = (conference: string, season?: string, initialData?: any) => {
  return useQuery<any, Error>({
    queryKey: ["twv", conference, season],
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => api.getTWV(conference, season),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};