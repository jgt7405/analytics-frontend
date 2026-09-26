import { useQuery } from "@tanstack/react-query";
import { proxyUrl } from "@/lib/proxy-url";
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
    queryKey: ["basketball-conf-data-history", season],
    queryFn: async () => {
      const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
      const response = await fetch(
        proxyUrl(`unified_conference_data/history${seasonQuery}`),
      );
      if (!response.ok) {
        throw new Error("Failed to fetch basketball conference data history");
      }
      return response.json();
    },
    ...queryCachePolicy("historical"),
  });
}