import { useQuery } from "@tanstack/react-query";

interface ConferenceData {
  conference_name: string;
  teamcount: number;
  teams: string[];
  netrtg_min: number;
  netrtg_q25: number;
  netrtg_median: number;
  netrtg_q75: number;
  netrtg_max: number;
  bid_distribution: Record<string, number>;
  average_bids: number;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

interface BasketballConfDataResponse {
  data: ConferenceData[];
}

export function useBasketballConfData() {
  return useQuery<BasketballConfDataResponse>({
    queryKey: ["basketball-conf-data"],
    queryFn: async () => {
      const response = await fetch("/api/proxy/unified_conference_data");
      if (!response.ok) {
        throw new Error("Failed to fetch basketball conference data");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
