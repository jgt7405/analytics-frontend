import { api } from "@/services/api";
import type { UnifiedConferenceDataResponse } from "@/services/basketball-api";
import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useConferenceData = (season?: string) => {
  return useQuery<UnifiedConferenceDataResponse, Error>({
    queryKey: ["conference-data", season],
    queryFn: () => api.getUnifiedConferenceData(),
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};