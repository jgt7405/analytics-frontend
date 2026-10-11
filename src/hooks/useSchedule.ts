import { api } from "@/services/api";
import { ScheduleApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useSchedule = (
  conference: string,
  season?: string,
  initialData?: ScheduleApiResponse,
) => {
  return useQuery<ScheduleApiResponse, Error>({
    queryKey: queryKeys.basketball.schedule(conference, season),
    initialData,
    // The server copy can be a stale cache hit (Next serves an expired entry
    // once while it revalidates), so refetch on mount rather than trust it.
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => api.getSchedule(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};