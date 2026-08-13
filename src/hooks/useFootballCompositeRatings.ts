import { CompositeRatingDatesResponse, CompositeRatingsResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export function useFootballCompositeRatings(date?: string) {
  return useQuery<CompositeRatingsResponse>({
    queryKey: ["football-composite-ratings", date],
    queryFn: async () => {
      const endpoint = date
        ? `/api/proxy/football/composite_ratings/history?date=${date}`
        : "/api/proxy/football/composite_ratings";
            const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Failed to fetch composite ratings");
      }
            return response.json();
        },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useFootballCompositeRatingDates() {
  return useQuery<CompositeRatingDatesResponse>({
    queryKey: ["football-composite-ratings-dates"],
    queryFn: async () => {
      const response = await fetch("/api/proxy/football/composite_ratings/dates");
      if (!response.ok) {
        throw new Error("Failed to fetch composite rating dates");
            }
            return response.json();
    },
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
