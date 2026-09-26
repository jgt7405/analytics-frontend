import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

interface TeamHistoryData {
  team_name: string;
  date: string;
  team_info: {
    logo_url: string;
    primary_color: string;
    secondary_color: string;
  };
}

interface StandingsHistoryData extends TeamHistoryData {
  avg_standing: number;
}

interface FirstPlaceHistoryData extends TeamHistoryData {
  first_place_pct: number;
}

interface ChampGameHistoryData extends TeamHistoryData {
  champ_game_pct: number;
}

interface ChampionHistoryData extends TeamHistoryData {
  champion_pct: number;
}

interface FootballStandingsHistoryResponse {
  timeline_data: StandingsHistoryData[];
  first_place_data: FirstPlaceHistoryData[];
  champ_game_data: ChampGameHistoryData[];
  champion_data: ChampionHistoryData[];
  debug: {
    total_records: number;
    unique_dates: number;
    has_today: boolean;
    today_date: string;
    duplicates: string[];
    date_range: string;
    champ_game_records: number;
    champion_records: number;
  };
}

export const useFootballStandingsHistory = (
  conference: string,
  season?: string,
) => {
  return useQuery<FootballStandingsHistoryResponse, Error>({
    queryKey: queryKeys.football.standingsHistory(conference, season),
    queryFn: async () => {
      const response = await fetch(
        apiUrl("football.standingsHistory", { conference }, { season }),
      );
      if (!response.ok) {
        throw new Error("Failed to fetch standings history");
      }
      return response.json();
    },
    enabled: !!conference,
    ...queryCachePolicy("historical"),
    retry: 3,
  });
};