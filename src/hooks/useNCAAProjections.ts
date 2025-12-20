import { useEffect, useState } from "react";

export interface NCAATeam {
  team_name: string;
  teamid: string;
  full_conference_name: string;
  seed: string;
  standing: number;
  status?: string;
  category?: string;
  post_conf_tourney_twv: number;
  kenpom_rank?: number;
  netrtg?: number;
  logo_url: string;
}

export interface SeedDistribution {
  [seed: string]: number;
}

export interface StatusDistribution {
  [status: string]: number;
}

export interface NCAAProjectionsResponse {
  tournament_teams: NCAATeam[];
  first_four_out: NCAATeam[];
  next_four_out: NCAATeam[];
  seed_distribution: SeedDistribution;
  status_distribution: StatusDistribution;
  summary?: {
    total_tournament_teams: number;
    total_first_four_out: number;
    total_next_four_out: number;
    auto_bids?: number;
    at_large_bids?: number;
    last_four_in?: number;
  };
  total_auto_bids?: number;
  total_at_large_bids?: number;
}

interface UseNCAAProjectionsResult {
  data: NCAAProjectionsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useNCAAProjections = (): UseNCAAProjectionsResult => {
  const [data, setData] = useState<NCAAProjectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/proxy/basketball/ncaa-projections", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch NCAA projections: ${response.status}`);
      }

      const jsonData: NCAAProjectionsResponse = await response.json();
      setData(jsonData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("NCAA Projections Error:", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
};
