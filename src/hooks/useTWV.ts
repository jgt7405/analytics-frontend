import { api } from "@/services/api";
import type { TWVApiResponse } from "@/services/basketball-api";
import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useTWV = (conference: string, season?: string, initialData?: TWVApiResponse) => {
  return useQuery<TWVApiResponse, Error>({
    queryKey: ["twv", conference, season],
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => api.getTWV(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};