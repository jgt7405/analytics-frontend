import { BasketballCompositeRatingsResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";
import { proxyUrl } from "@/lib/proxy-url";
import { queryCachePolicy } from "@/lib/cache-policy";

export function useBasketballCompositeRatings() {
  return useQuery<BasketballCompositeRatingsResponse>({
    queryKey: ["basketball-composite-ratings"],
    queryFn: async () => {
      const response = await fetch(proxyUrl("basketball/composite_ratings"));
      if (!response.ok) {
        throw new Error("Failed to fetch composite ratings");
      }
      return response.json();
    },
    ...queryCachePolicy("currentStandings"),
    refetchOnWindowFocus: false,
  });
}
