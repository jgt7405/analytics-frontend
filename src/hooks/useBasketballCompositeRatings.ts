import { BasketballCompositeRatingsResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

export function useBasketballCompositeRatings() {
  return useQuery<BasketballCompositeRatingsResponse>({
    queryKey: queryKeys.basketball.compositeRatings(),
    queryFn: async () => {
      const response = await fetch(apiUrl("basketball.compositeRatings"));
      if (!response.ok) {
        throw new Error("Failed to fetch composite ratings");
      }
      return response.json();
    },
    ...queryCachePolicy("currentStandings"),
    refetchOnWindowFocus: false,
  });
}
