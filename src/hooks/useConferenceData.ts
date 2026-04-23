import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useConferenceData = (season?: string) => {
  return useQuery<any, Error>({
    queryKey: ["conference-data", season],
    queryFn: () => api.getUnifiedConferenceData(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};