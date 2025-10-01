// src/hooks/useBasketballTeamAllHistory.ts
import { useQuery } from "@tanstack/react-query";

interface HistoricalDataPoint {
  date: string;
  projected_conf_wins: number;
  projected_total_wins: number;
  standings_with_ties: number;
  standings_no_ties: number;
  first_place_with_ties: number;
  first_place_no_ties: number;
  kenpom_rank: number | null;
  version_id: string;
  is_current?: boolean;
}

interface TournamentRoundData {
  date: string;
  team_name: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  sweet_sixteen_pct?: number;
  elite_eight_pct?: number;
  final_four_pct?: number;
  championship_pct?: number;
  champion_pct?: number;
}

interface BasketballTeamAllHistoryResponse {
  confWins: {
    data: HistoricalDataPoint[];
    conference_size: number;
  };
  ncaa: {
    tournament_bid_data: TournamentRoundData[];
    average_seed_data: TournamentRoundData[];
    sweet_sixteen_data: TournamentRoundData[];
    elite_eight_data: TournamentRoundData[];
    final_four_data: TournamentRoundData[];
    championship_data: TournamentRoundData[];
    champion_data: TournamentRoundData[];
  };
}

export const useBasketballTeamAllHistory = (teamName: string) => {
  return useQuery<BasketballTeamAllHistoryResponse, Error>({
    queryKey: ["basketball-team-all-history", teamName],
    queryFn: async () => {
      // Fetch both endpoints in parallel
      const [confWinsResponse, ncaaResponse] = await Promise.all([
        fetch(
          `/api/proxy/basketball/team/${encodeURIComponent(teamName)}/history/conf_wins`
        ),
        fetch(
          `/api/proxy/basketball/ncaa/${encodeURIComponent(teamName)}/history`
        ),
      ]);

      if (!confWinsResponse.ok || !ncaaResponse.ok) {
        throw new Error("Failed to fetch basketball team history");
      }

      const confWinsData = await confWinsResponse.json();
      const ncaaData = await ncaaResponse.json();

      return {
        confWins: confWinsData.confWins || confWinsData, // Handle both response formats
        ncaa: ncaaData.ncaa, // Extract the ncaa data from the response
      };
    },
    enabled: !!teamName,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};
