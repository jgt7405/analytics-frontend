import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";
import { queryKeys } from "@/lib/query-keys";
import { getSiteStatistics } from "@/services/statistics-api";

export function useSiteStatistics(days: string, sport = "all", scope = "all", dimension?: string, value?: string, dimension2?: string, value2?: string) {
  return useQuery({
    queryKey: queryKeys.basketball.siteStatistics(days, sport, scope, dimension, value, dimension2, value2),
    queryFn: () => getSiteStatistics(days, sport, scope, dimension, value, dimension2, value2),
    ...queryCachePolicy("uncached"),
    refetchInterval: ({ state }) => {
      const rollover = state.data?.next_calendar_rollover;
      if (!rollover || state.status === "error") return false;
      return Math.max(1000, Date.parse(rollover) - Date.now());
    },
  });
}
