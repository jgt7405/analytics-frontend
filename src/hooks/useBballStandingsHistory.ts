// src/hooks/useBballStandingsHistory.ts
import { useQuery } from "@tanstack/react-query";

interface TimelineData {
  team_name: string;
  date: string;
  avg_standing: number;
  version_id?: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface FirstPlaceData {
  team_name: string;
  date: string;
  first_place_pct: number;
  version_id?: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface BballStandingsHistoryResponse {
  timeline_data: TimelineData[];
  first_place_data: FirstPlaceData[];
  debug?: {
    total_records: number;
    unique_dates: number;
    has_today: boolean;
    today_date: string;
  };
}

export function useBballStandingsHistory(conference: string) {
  return useQuery<BballStandingsHistoryResponse>({
    queryKey: ["bball-standings-history", conference],
    queryFn: async () => {
      const response = await fetch(
        `/api/proxy/standings/${conference.replace(" ", "_")}/history`
      );
      if (!response.ok)
        throw new Error("Failed to fetch basketball standings history");
      return response.json();
    },
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
