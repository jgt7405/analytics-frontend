import { useQuery } from "@tanstack/react-query";

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

export function useBasketballConfDataHistory() {
  return useQuery<BasketballConfDataHistoryResponse>({
    queryKey: ["basketball-conf-data-history"],
    queryFn: async () => {
      const response = await fetch(
        "/api/proxy/unified_conference_data/history"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch basketball conference data history");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
