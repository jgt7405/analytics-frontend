// src/hooks/useFootballTeam.ts
import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

interface FootballTeamInfo {
  team_name: string;
  team_id: string;
  conference: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  overall_record: string;
  conference_record: string;
  cfp_bid_pct?: number;
  average_seed?: number;
  sagarin_rank?: number;
  rating?: number;
  seed_distribution: Record<string, number>;
  win_seed_counts: Array<{
    Seed: string | number;
    Percentage: number;
    Tournament_Status: string;
    Wins: number;
    Count: number;
    Conf_Champ_Pct?: number;
    At_Large_Pct?: number;
  }>;
}

interface FootballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  opponent_primary_color?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  sagarin_rank?: number;
  opp_rnk?: number;
  team_win_prob?: number;
  sag12_win_prob?: number;
  team_points?: number;
  opp_points?: number;
  team_conf?: string;
  team_conf_catg?: string;
}

interface FootballTeamData {
  team_info: FootballTeamInfo;
  schedule: FootballTeamGame[];
  all_schedule_data: Array<{
    team: string;
    opponent: string;
    opponent_primary_color?: string;
    sag12_win_prob: number;
    team_conf: string;
    team_conf_catg: string;
    status: string;
  }>;
}

export const useFootballTeam = (teamName: string) => {
  return useQuery<FootballTeamData, Error>({
    queryKey: ["football-team", teamName],
    queryFn: () => api.getFootballTeam(teamName),
    enabled: !!teamName,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
