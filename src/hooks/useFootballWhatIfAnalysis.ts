import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/services/api";

export function useFootballWhatIfAnalysis(days: string) {
  return useQuery({
    queryKey: queryKeys.football.whatIfAnalysis(days),
    queryFn: () => api.getFootballWhatIfAnalysis(days),
    ...queryCachePolicy("live"),
  });
}
