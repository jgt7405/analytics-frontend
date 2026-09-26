import { WhatIfGame } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { proxyUrl } from "@/lib/proxy-url";
import { queryCachePolicy } from "@/lib/cache-policy";

interface AllFutureGamesResponse {
  success: boolean;
  games: WhatIfGame[];
  count: number;
}

const fetchAllFutureGames = async (): Promise<AllFutureGamesResponse> => {
  const response = await fetch(proxyUrl("football/all_future_games"));
  if (!response.ok) throw new Error(`Failed to fetch all future games: ${response.statusText}`);
  return response.json();
};

export const useFootballFutureGames = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["football-all-future-games"],
    queryFn: fetchAllFutureGames,
    enabled,
    ...queryCachePolicy("live"),
    refetchOnWindowFocus: false,
  });
};