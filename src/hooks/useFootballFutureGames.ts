// Create new file: frontend/src/hooks/useFootballFutureGames.ts

import { WhatIfGame } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

interface FutureGamesResponse {
  games: WhatIfGame[];
}

const fetchFutureGames = async (): Promise<FutureGamesResponse> => {
  const response = await fetch("/api/proxy/football/future_games");

  if (!response.ok) {
    throw new Error(`Failed to fetch future games: ${response.statusText}`);
  }

  return response.json();
};

export const useFootballFutureGames = () => {
  return useQuery({
    queryKey: ["football-future-games"],
    queryFn: fetchFutureGames,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
