import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/services/api";

export function useCompareAnalysis(sport: "basketball" | "football", days: string) {
  return useQuery({
    queryKey: queryKeys[sport].compareAnalysis(days),
    queryFn: () => api.getCompareAnalysis(sport, days),
    ...queryCachePolicy("live"),
  });
}
