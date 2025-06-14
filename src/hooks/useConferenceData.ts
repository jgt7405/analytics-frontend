import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useConferenceData = () => {
  return useQuery<any, Error>({
    queryKey: ["conference-data"],
    queryFn: () => api.getUnifiedConferenceData(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
