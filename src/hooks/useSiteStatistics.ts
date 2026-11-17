import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";
import { queryKeys } from "@/lib/query-keys";
import { getSiteStatistics } from "@/services/statistics-api";

export function useSiteStatistics(days: string, sport = "all", scope = "all", dimension?: string, value?: string, dimension2?: string, value2?: string) {
  return useQuery({
    queryKey: queryKeys.basketball.siteStatistics(days, sport, scope, dimension, value, dimension2, value2),
    queryFn: () => getSiteStatistics(days, sport, scope, dimension, value, dimension2, value2),
    ...queryCachePolicy("live"),
  });
}
