import { api } from "@/services/api";
import { ScheduleApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";

export const useSchedule = (
  conference: string,
  season?: string,
  initialData?: ScheduleApiResponse,
) => {
  return useQuery<ScheduleApiResponse, Error>({
    queryKey: ["schedule", conference, season],
    initialData,
    queryFn: () => api.getSchedule(conference, season),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};