import { WhatIfGame } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

interface AllFutureGamesResponse {
  success: boolean;
  games: WhatIfGame[];
  count: number;
}

const fetchAllFutureGames = async (): Promise<AllFutureGamesResponse> => {
  const response = await fetch(apiUrl("football.allFutureGames"));
  if (!response.ok) throw new Error(`Failed to fetch all future games: ${response.statusText}`);
  return response.json();
};

export const useFootballFutureGames = (enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.football.allFutureGames(),
    queryFn: fetchAllFutureGames,
    enabled,
    ...queryCachePolicy("live"),
    refetchOnWindowFocus: false,
  });
};