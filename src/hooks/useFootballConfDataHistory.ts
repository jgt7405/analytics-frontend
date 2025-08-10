import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

interface ConfHistoryData {
  conference_name: string;
  date: string;
  avg_bids: number;
  conf_info: {
    primary_color?: string;
    secondary_color?: string;
  };
}

interface FootballConfHistoryResponse {
  timeline_data: ConfHistoryData[];
}

export function useFootballConfDataHistory() {
  return useQuery({
    queryKey: ["football-conf-data-history"],
    queryFn: async (): Promise<FootballConfHistoryResponse> => {
      return api.get<FootballConfHistoryResponse>(
        "/football_conf_data/history"
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
