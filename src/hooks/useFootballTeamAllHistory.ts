// src/hooks/useFootballTeamAllHistory.ts
import { useQuery } from "@tanstack/react-query";

interface ConfWinsHistoryResponse {
  data: Array<{
    date: string;
    projected_conf_wins: number;
    projected_total_wins: number;
    standings_with_ties: number;
    standings_no_ties: number;
    first_place_with_ties: number;
    first_place_no_ties: number;
    sagarin_rank: number | null;
    version_id: string;
    is_current?: boolean;
  }>;
  conference_size: number;
}

interface CFPHistoryResponse {
  cfp_bid_data: Array<{
    date: string;
    cfp_bid_pct: number;
    team_name: string;
    team_info: {
      logo_url?: string;
      primary_color?: string;
      secondary_color?: string;
    };
  }>;
  average_seed_data: Array<{
    date: string;
    average_seed: number;
    team_name: string;
    team_info: {
      logo_url?: string;
      primary_color?: string;
      secondary_color?: string;
    };
  }>;
  cfp_champion_data: Array<{
    date: string;
    cfp_champion_pct: number;
    team_name: string;
    team_info: object;
  }>;
  cfp_championship_data: Array<{
    date: string;
    cfp_championship_pct: number;
    team_name: string;
    team_info: object;
  }>;
  cfp_semifinals_data: Array<{
    date: string;
    cfp_semifinals_pct: number;
    team_name: string;
    team_info: object;
  }>;
  cfp_quarterfinals_data: Array<{
    date: string;
    cfp_quarterfinals_pct: number;
    team_name: string;
    team_info: object;
  }>;
}

interface AllHistoryData {
  confWins: ConfWinsHistoryResponse;
  cfp: CFPHistoryResponse;
}

export const useFootballTeamAllHistory = (teamName: string) => {
  return useQuery<AllHistoryData, Error>({
    queryKey: ["football-team-all-history", teamName],
    queryFn: async () => {
      const [confWinsResponse, cfpResponse] = await Promise.all([
        fetch(
          `/api/proxy/football/team/${encodeURIComponent(teamName)}/history/conf_wins`
        ),
        fetch(
          `/api/proxy/football/cfp/${encodeURIComponent(teamName)}/history`
        ),
      ]);

      if (!confWinsResponse.ok) {
        throw new Error("Failed to fetch conference wins history");
      }
      if (!cfpResponse.ok) {
        throw new Error("Failed to fetch CFP history");
      }

      return {
        confWins: await confWinsResponse.json(),
        cfp: await cfpResponse.json(),
      };
    },
    enabled: !!teamName,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};
