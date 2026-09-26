import { api } from "@/services/api";
import type { SeedApiResponse } from "@/services/basketball-api";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useSeed = (
  conference: string,
  season?: string,
  initialData?: SeedApiResponse,
) => {
  return useQuery<SeedApiResponse, Error>({
    queryKey: queryKeys.basketball.seed(conference, season),
    initialData,
    queryFn: () => api.getSeedData(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};