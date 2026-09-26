import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

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
  twv_50?: number;
  cwv?: number;
  kenpom_rank?: number;
  opp_kp_rank?: number;
  team_win_prob?: number;
  rk50_win_prob?: number;
  team_points?: number;
  opp_points?: number;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  rk50_win_prob: number;
  team_conf: string;
  status: string;
}

export interface TeamData {
  team_info: TeamInfo;
  schedule: TeamGame[];
  all_schedule_data?: AllScheduleGame[];
}

export const useBasketballTeamData = (
  teamName: string,
  season?: string,
  initialData?: TeamData,
) => {
  return useQuery<TeamData, Error>({
    queryKey: queryKeys.basketball.team(teamName, season),
    initialData,
    // The SSR initialData is served WITHOUT the heavy league-wide
    // all_schedule_data (~2MB) to keep the crawlable HTML light. Mark it
    // immediately stale so the client refetches the full dataset on mount,
    // which populates the charts that need all_schedule_data.
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: async () => {
      const response = await fetch(
        apiUrl("basketball.team", { team: teamName }, { season })
      );
      if (!response.ok) throw new Error("Failed to load team data");
      return response.json();
    },
    enabled: !!teamName,
    ...queryCachePolicy("currentStandings"),
    retry: 2,
  });
};
