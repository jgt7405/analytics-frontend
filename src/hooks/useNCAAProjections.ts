"use client";

import { useQuery } from "@tanstack/react-query";

export interface NCAATeam {
  team_name: string;
  teamid: string;
  full_conference_name: string;
  seed?: string;
  standing?: number;
  category?: string;
  post_conf_tourney_twv: number;
  kenpom_rank?: number;
  netrtg?: number;
  logo_url: string;
  conf_logo_url?: string;
}

export interface NCAAProjectionsResponse {
  tournament_teams: NCAATeam[];
  first_four_out: NCAATeam[];
  next_four_out: NCAATeam[];
  total_auto_bids: number;
  total_at_large_bids: number;
  last_updated?: string;
}

interface UseNCAAProjectionsReturn {
  data: NCAAProjectionsResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useNCAAProjections(): UseNCAAProjectionsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ncaa-projections"],
    queryFn: async () => {
      const response = await fetch("/api/proxy/basketball/ncaa-projections");
      if (!response.ok) {
        throw new Error("Failed to fetch NCAA projections");
      }
      return response.json() as Promise<NCAAProjectionsResponse>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });

  return {
    data: data || null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}
