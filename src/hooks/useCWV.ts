import { api } from "@/services/api";
import { CWVApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useCWV = (
  conference: string,
  season?: string,
  initialData?: CWVApiResponse,
) => {
  return useQuery<CWVApiResponse, Error>({
    queryKey: ["cwv", conference, season],
    initialData,
    queryFn: () => api.getCWV(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};