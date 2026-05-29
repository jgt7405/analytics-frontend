import { api } from "@/services/api";
import type { SeedApiResponse } from "@/services/basketball-api";
import { useQuery } from "@tanstack/react-query";

export const useSeed = (
  conference: string,
  season?: string,
  initialData?: SeedApiResponse,
) => {
  return useQuery<any, Error>({
    queryKey: ["seed", conference, season],
    initialData,
    queryFn: () => api.getSeedData(conference, season),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};