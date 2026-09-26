import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

interface ConfHistoryData {
  conference: string; // ← Note: "conference" not "conference_name"
  date: string;
  avg_bids: number;
  bid_distribution?: Record<string, number>;
  conference_info: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
}

interface BasketballConfDataHistoryResponse {
  timeline_data: ConfHistoryData[];
  debug?: Record<string, unknown>;
}

export function useBasketballConfDataHistory(season?: string) {
  return useQuery<BasketballConfDataHistoryResponse>({
    queryKey: queryKeys.basketball.confDataHistory(season),
    queryFn: async () => {
      const response = await fetch(
        apiUrl("basketball.conferenceDataHistory", {}, { season }),
      );
      if (!response.ok) {
        throw new Error("Failed to fetch basketball conference data history");
      }
      return response.json();
    },
    ...queryCachePolicy("historical"),
  });
}