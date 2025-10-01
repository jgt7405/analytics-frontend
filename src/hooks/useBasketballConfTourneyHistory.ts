// src/hooks/useBasketballConfTourneyHistory.ts
import { useQuery } from "@tanstack/react-query";

interface TeamHistoryData {
  team_name: string;
  date: string;
  team_info: {
    logo_url: string;
    primary_color: string;
    secondary_color: string;
  };
}

interface ChampionHistoryData extends TeamHistoryData {
  champion_pct: number;
}

interface FinalsHistoryData extends TeamHistoryData {
  finals_pct: number;
}

interface SemifinalsHistoryData extends TeamHistoryData {
  semifinals_pct: number;
}

interface QuarterfinalsHistoryData extends TeamHistoryData {
  quarterfinals_pct: number;
}

interface BasketballConfTourneyHistoryResponse {
  champion_data: ChampionHistoryData[];
  finals_data: FinalsHistoryData[];
  semifinals_data: SemifinalsHistoryData[];
  quarterfinals_data: QuarterfinalsHistoryData[];
  debug: {
    total_records: number;
    unique_dates: number;
    has_today: boolean;
    today_date: string;
    duplicates: string[];
    date_range: string;
    champion_records: number;
    finals_records: number;
    semifinals_records: number;
    quarterfinals_records: number;
  };
}

export const useBasketballConfTourneyHistory = (conference: string) => {
  return useQuery<BasketballConfTourneyHistoryResponse, Error>({
    queryKey: ["basketball-conf-tourney-history", conference],
    queryFn: async () => {
      const response = await fetch(
        `/api/proxy/conf_tourney/${conference}/history`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch conference tournament history");
      }
      return response.json();
    },
    enabled: !!conference,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};
