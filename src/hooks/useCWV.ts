import { api } from "@/services/api";
import { CWVApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useCWV = (
  conference: string,
  season?: string,
  initialData?: CWVApiResponse,
) => {
  return useQuery<CWVApiResponse, Error>({
    queryKey: queryKeys.basketball.cwv(conference, season),
    initialData,
    // The server copy can be a stale cache hit (Next serves an expired entry
    // once while it revalidates), so refetch on mount rather than trust it.
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => api.getCWV(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};