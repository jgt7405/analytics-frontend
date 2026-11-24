import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";
import { queryKeys } from "@/lib/query-keys";
import { getSiteStatisticsInsights } from "@/services/statistics-api";

/** The statistics page's second section. `enabled` stays false until the
 *  section scrolls into view: its queries are the heaviest on the page. */
export function useSiteStatisticsInsights(enabled: boolean, days: string, sport = "all", scope = "all", dimension?: string, value?: string, dimension2?: string, value2?: string) {
  return useQuery({
    queryKey: queryKeys.basketball.siteStatisticsInsights(days, sport, scope, dimension, value, dimension2, value2),
    queryFn: () => getSiteStatisticsInsights(days, sport, scope, dimension, value, dimension2, value2),
    ...queryCachePolicy("uncached"),
    enabled,
    // "Active now" and the period comparisons move; the backend caches each
    // answer for five minutes, so refreshing more often gains nothing.
    refetchInterval: 5 * 60 * 1000,
  });
}
