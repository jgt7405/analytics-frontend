import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";
import { queryKeys } from "@/lib/query-keys";
import { getSiteStatistics } from "@/services/statistics-api";

export function useSiteStatistics(days: string, sport = "all", scope = "all", dimension?: string, value?: string) {
  return useQuery({
    queryKey: queryKeys.basketball.siteStatistics(days, sport, scope, dimension, value),
    queryFn: () => getSiteStatistics(days, sport, scope, dimension, value),
    ...queryCachePolicy("live"),
  });
}
