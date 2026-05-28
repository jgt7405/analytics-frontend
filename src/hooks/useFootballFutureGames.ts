import { WhatIfGame } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

interface AllFutureGamesResponse {
  success: boolean;
  games: WhatIfGame[];
  count: number;
}

const fetchAllFutureGames = async (): Promise<AllFutureGamesResponse> => {
  const response = await fetch("/api/proxy/football/all_future_games");
  if (!response.ok) throw new Error(`Failed to fetch all future games: ${response.statusText}`);
  return response.json();
};

export const useFootballFutureGames = () => {
  return useQuery({
    queryKey: ["football-all-future-games"],
    queryFn: fetchAllFutureGames,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};