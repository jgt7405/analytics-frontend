import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";
import { queryKeys } from "@/lib/query-keys";
import { getSiteStatistics } from "@/services/statistics-api";

export function useSiteStatistics(days: string, sport = "all", scope = "current") {
  return useQuery({
    queryKey: queryKeys.basketball.siteStatistics(days, sport, scope),
    queryFn: () => getSiteStatistics(days, sport, scope),
    ...queryCachePolicy("live"),
  });
}
