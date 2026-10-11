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
    // The server copy can be a stale cache hit (Next serves an expired entry
    // once while it revalidates), so refetch on mount rather than trust it.
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => api.getSeedData(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};