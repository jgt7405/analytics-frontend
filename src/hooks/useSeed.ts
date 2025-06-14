import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const useSeed = (conference: string) => {
  return useQuery<any, Error>({
    queryKey: ["seed", conference],
    queryFn: () => api.getSeedData(conference),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
