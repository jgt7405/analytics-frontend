// src/hooks/useFootballCFPHistory.ts
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

interface CFPBidHistoryData extends TeamHistoryData {
  cfp_bid_pct: number;
}

interface AverageSeedHistoryData extends TeamHistoryData {
  average_seed: number;
}

interface CFPChampionHistoryData extends TeamHistoryData {
  cfp_champion_pct: number;
}

interface CFPChampionshipHistoryData extends TeamHistoryData {
  cfp_championship_pct: number;
}

interface CFPSemifinalsHistoryData extends TeamHistoryData {
  cfp_semifinals_pct: number;
}

interface CFPQuarterfinalsHistoryData extends TeamHistoryData {
  cfp_quarterfinals_pct: number;
}

interface CFPFirstRoundHistoryData extends TeamHistoryData {
  cfp_first_round_pct: number;
}

interface FootballCFPHistoryResponse {
  cfp_bid_data: CFPBidHistoryData[];
  average_seed_data: AverageSeedHistoryData[];
  cfp_champion_data: CFPChampionHistoryData[];
  cfp_championship_data: CFPChampionshipHistoryData[];
  cfp_semifinals_data: CFPSemifinalsHistoryData[];
  cfp_quarterfinals_data: CFPQuarterfinalsHistoryData[];
  cfp_first_round_data: CFPFirstRoundHistoryData[];
  debug: {
    total_records: number;
    unique_dates: number;
    has_today: boolean;
    today_date: string;
    duplicates: string[];
    date_range: string;
    cfp_bid_records: number;
    avg_seed_records: number;
    cfp_champion_records: number;
    cfp_championship_records: number;
    cfp_semifinals_records: number;
    cfp_quarterfinals_records: number;
    cfp_first_round_records: number;
  };
}

export const useFootballCFPHistory = (conference: string) => {
  return useQuery<FootballCFPHistoryResponse, Error>({
    queryKey: ["football-cfp-history", conference],
    queryFn: async () => {
      const response = await fetch(`/api/proxy/cfp/${conference}/history`);
      if (!response.ok) {
        throw new Error("Failed to fetch CFP history");
      }
      return response.json();
    },
    enabled: !!conference,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};
