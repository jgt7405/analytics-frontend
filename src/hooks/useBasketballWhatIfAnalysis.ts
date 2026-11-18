import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/services/api";

export function useBasketballWhatIfAnalysis(days: string) {
  return useQuery({
    queryKey: queryKeys.basketball.whatIfAnalysis(days),
    queryFn: () => api.getBasketballWhatIfAnalysis(days),
    ...queryCachePolicy("live"),
  });
}
