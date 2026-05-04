import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

interface WinSeedCountEntry {
  Wins: number;
  Seed?: string;
  Tournament_Status?: string;
  Count: number;
}

interface TeamInfo {
  team_name: string;
  team_id: string;
  conference: string;
  logo_url: string;
  conf_logo_url?: string;
  primary_color: string;
  secondary_color: string;
  overall_record: string;
  conference_record: string;
  tournament_bid_pct?: number;
  average_seed?: number;
  kenpom_rank?: number;
  seed_distribution: Record<string, number>;
  win_seed_counts: WinSeedCountEntry[];
}

interface TeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  kenpom_rank?: number;
  opp_kp_rank?: number;
  team_win_prob?: number;
  kenpom_win_prob?: number;
  team_points?: number;
  opp_points?: number;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  kenpom_win_prob: number;
  team_conf: string;
  status: string;
}

interface TeamData {
  team_info: TeamInfo;
  schedule: TeamGame[];
  all_schedule_data?: AllScheduleGame[];
}

export const useBasketballTeamData = (teamName: string) => {
  return useQuery<TeamData, Error>({
    queryKey: ["basketball-team-data", teamName],
    queryFn: async () => {
      const response = await fetch(
        `/api/proxy/team/${encodeURIComponent(teamName)}`
      );
      if (!response.ok) throw new Error("Failed to load team data");
      return response.json();
    },
    enabled: !!teamName,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
};
