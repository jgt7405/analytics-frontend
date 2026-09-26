import { api } from "@/services/api";
import { apiPath } from "@/api/urls";
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
      return api.get<FootballConfHistoryResponse>(
        apiPath("football.conferenceDataHistory", {}, { season }),
      );
    },
    ...queryCachePolicy("historical"),
    retry: 2,
  });
}