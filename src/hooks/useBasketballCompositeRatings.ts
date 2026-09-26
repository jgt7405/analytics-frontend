import { BasketballCompositeRatingsResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";
import { proxyUrl } from "@/lib/proxy-url";

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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
