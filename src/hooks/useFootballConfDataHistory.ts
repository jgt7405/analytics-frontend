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

export function useFootballConfDataHistory(season?: string) {
  return useQuery({
    queryKey: ["football-conf-data-history", season],
    queryFn: async (): Promise<FootballConfHistoryResponse> => {
      const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
      return api.get<FootballConfHistoryResponse>(
        `/football_conf_data/history${seasonQuery}`,
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}