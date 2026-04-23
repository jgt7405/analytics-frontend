import { api } from "@/services/api";
import { ScheduleApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";

export const useSchedule = (conference: string, season?: string) => {
  return useQuery<ScheduleApiResponse, Error>({
    queryKey: ["schedule", conference, season],
    queryFn: () => api.getSchedule(conference),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};