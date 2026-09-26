import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { proxyUrl } from "@/lib/proxy-url";
import { queryCachePolicy } from "@/lib/cache-policy";

// Fields of /basketball/upcoming_games used for game-preview links. The
// response has many more per game (odds, ratings) for the preview page.
export interface UpcomingGame {
  game_id: string;
  is_next_game_for_both: boolean;
  home_team: string;
  away_team: string;
  date_sort: string;
  [key: string]: unknown;
}

export interface UpcomingGamesResponse {
  games?: UpcomingGame[];
}

const fetchUpcomingGames = async (): Promise<UpcomingGamesResponse> => {
  const response = await fetch(proxyUrl("basketball/upcoming_games"));
  if (!response.ok) throw new Error(`Failed to fetch upcoming games: ${response.status}`);
  return response.json();
};

export const useBasketballUpcomingGames = () =>
  useQuery({
    queryKey: queryKeys.basketball.upcomingGames(),
    queryFn: fetchUpcomingGames,
    ...queryCachePolicy("live"),
  });
