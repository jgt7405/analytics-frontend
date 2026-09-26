import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { queryCachePolicy } from "@/lib/cache-policy";

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
    queryKey: queryKeys.football.confDataHistory(season),
    queryFn: async (): Promise<FootballConfHistoryResponse> => {
      const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
      return api.get<FootballConfHistoryResponse>(
        `/football_conf_data/history${seasonQuery}`,
      );
    },
    ...queryCachePolicy("historical"),
    retry: 2,
  });
}