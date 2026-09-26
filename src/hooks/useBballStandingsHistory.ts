import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

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

export function useBballStandingsHistory(
  conference: string,
  season?: string,
) {
  return useQuery<BballStandingsHistoryResponse>({
    queryKey: queryKeys.basketball.standingsHistory(conference, season),
    queryFn: async () => {
      const response = await fetch(
        apiUrl("basketball.standingsHistory", { conference: conference.replace(" ", "_") }, { season }),
      );
      if (!response.ok)
        throw new Error("Failed to fetch basketball standings history");
      return response.json();
    },
    enabled: !!conference,
    ...queryCachePolicy("historical"),
  });
}