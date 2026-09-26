import { CompositeRatingDatesResponse, CompositeRatingsResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { proxyUrl } from "@/lib/proxy-url";
import { queryCachePolicy } from "@/lib/cache-policy";

export function useFootballCompositeRatings(date?: string) {
  return useQuery<CompositeRatingsResponse>({
    queryKey: ["football-composite-ratings", date],
    queryFn: async () => {
      const endpoint = date
        ? proxyUrl(`football/composite_ratings/history?date=${date}`)
        : proxyUrl("football/composite_ratings");
            const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Failed to fetch composite ratings");
      }
            return response.json();
        },
    // A past date's ratings are frozen; the latest ones update daily.
    ...queryCachePolicy(date ? "historical" : "currentStandings"),
    refetchOnWindowFocus: false,
  });
}

export function useFootballCompositeRatingDates() {
  return useQuery<CompositeRatingDatesResponse>({
    queryKey: ["football-composite-ratings-dates"],
    queryFn: async () => {
      const response = await fetch(proxyUrl("football/composite_ratings/dates"));
      if (!response.ok) {
        throw new Error("Failed to fetch composite rating dates");
            }
            return response.json();
    },
    ...queryCachePolicy("currentStandings"),
    refetchOnWindowFocus: false,
  });
}
