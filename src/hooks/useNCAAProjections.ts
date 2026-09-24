"use client";

import { useQuery } from "@tanstack/react-query";

export interface NCAATeam {
  team_name: string;
  teamid: string;
  full_conference_name: string;
  seed?: string;
  standing?: number;
  category?: string;
  post_conf_tourney_twv_50: number;
  // TWV vs the rank-30/50/200 baselines and the rating: projected
  // (season-average) in season mode, completed games / today's rating in
  // current mode. Null where a season predates the column.
  twv_30?: number | null;
  twv_50?: number | null;
  twv_200?: number | null;
  rating?: number | null;
  // Baseline rank whose TWV seeded the team (30 = seeds 1-4 tier, 50 = 5-11,
  // 200 = 12-16); 50 for teams outside the field, null when unavailable.
  seed_twv_rank?: 30 | 50 | 200 | null;
  // Blend under each tier's formula, 65% TWV N + 35% rating, scaled 0-100
  // over the teams shown. Null for seasons that predate TWV 30/200.
  blend_30?: number | null;
  blend_50?: number | null;
  blend_200?: number | null;
  kenpom_rank?: number;
  netrtg?: number;
  logo_url: string;
  conf_logo_url?: string;
  is_conf_tourney_winner?: boolean; // NEW: Tracks if team won completed conf tournament
}

export interface NCAAProjectionsResponse {
  tournament_teams: NCAATeam[];
  first_four_out: NCAATeam[];
  next_four_out: NCAATeam[];
  total_auto_bids: number;
  total_at_large_bids: number;
  mode?: NCAAProjectionsMode;
  // False until games have been played - current TWV is all zeros before then.
  current_available?: boolean;
  last_updated?: string;
}

export type NCAAProjectionsMode = "season" | "current";

interface UseNCAAProjectionsReturn {
  data: NCAAProjectionsResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useNCAAProjections(
  season?: string,
  initialData?: NCAAProjectionsResponse,
  mode: NCAAProjectionsMode = "season",
): UseNCAAProjectionsReturn {
  const params = new URLSearchParams();
  if (season) params.set("season", season);
  if (mode === "current") params.set("mode", "current");
  const query = params.toString() ? `?${params.toString()}` : "";
  // Server-rendered initial data is the season projection only
  const seeded = mode === "season" ? initialData : undefined;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ncaa-projections", season, mode],
    initialData: seeded,
    initialDataUpdatedAt: seeded ? 0 : undefined,
    queryFn: async () => {
      const response = await fetch(
        `/api/proxy/basketball/ncaa-projections${query}`,
      );
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