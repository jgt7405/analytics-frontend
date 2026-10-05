import { CompositeRatingDatesResponse, CompositeRatingsResponse, CompositeRatingsTimelineResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

export function useFootballCompositeRatings(date?: string) {
  return useQuery<CompositeRatingsResponse>({
    queryKey: queryKeys.football.compositeRatings(date),
    queryFn: async () => {
      const endpoint = date
        ? apiUrl("football.compositeRatingsHistory", {}, { date })
        : apiUrl("football.compositeRatings");
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

export function useFootballCompositeRatingsTimeline(teams: string[]) {
  return useQuery<CompositeRatingsTimelineResponse>({
    queryKey: queryKeys.football.compositeRatingsTimeline(teams),
    queryFn: async () => {
      const response = await fetch(apiUrl("football.compositeRatingsTimeline", {}, { teams: teams.join(",") }));
      if (!response.ok) throw new Error("Failed to fetch composite rating history");
      return response.json();
    },
    enabled: teams.length > 0,
    ...queryCachePolicy("historical"),
  });
}

export function useFootballCompositeRatingDates() {
  return useQuery<CompositeRatingDatesResponse>({
    queryKey: queryKeys.football.compositeRatingDates(),
    queryFn: async () => {
      const response = await fetch(apiUrl("football.compositeRatingsDates"));
      if (!response.ok) {
        throw new Error("Failed to fetch composite rating dates");
            }
            return response.json();
    },
    ...queryCachePolicy("currentStandings"),
    refetchOnWindowFocus: false,
  });
}
