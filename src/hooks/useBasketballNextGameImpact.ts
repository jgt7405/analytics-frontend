import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { proxyUrl } from "@/lib/proxy-url";
import { queryCachePolicy } from "@/lib/cache-policy";

export interface NextGameMetrics {
  first_seed_pct: number;
  top4_pct: number;
  top8_pct: number;
  avg_seed: number;
  avg_conf_wins: number;
  num_teams: number;
  [key: `seed_${number}_pct`]: number;
  // NCAA tournament projection fields
  tournament_bid_pct?: number;
  average_seed?: number | null;
  ncaa_seed_distribution?: Record<string, number>;
}

export interface NextGameImpactData {
  success: boolean;
  team_id: number;
  team_name: string;
  opponent_id: number;
  opponent_name: string;
  is_home: boolean;
  game: {
    game_id: number;
    date: string;
    home_team: string;
    away_team: string;
    home_team_id: number;
    away_team_id: number;
    home_team_logo: string;
    away_team_logo: string;
    home_probability: number | null;
    away_probability: number | null;
    neutral_site?: boolean;
  } | null;
  current: Record<number, NextGameMetrics>;
  with_win: Record<number, NextGameMetrics>;
  with_loss: Record<number, NextGameMetrics>;
  calculation_time: number;
  error?: string;
}

const fetchNextGameImpact = async (
  conference: string,
  teamId: number,
  signal: AbortSignal,
): Promise<NextGameImpactData> => {
  const res = await fetch(proxyUrl("basketball/whatif/next-game-impact"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conference, team_id: teamId }),
    signal,
  });
  if (!res.ok) throw new Error(`Impact fetch failed: ${res.status}`);
  return res.json();
};

/** How a team's seed odds move if it wins or loses its next game. A POST
 *  (it runs simulations), but a pure read, so it is queried and cached per
 *  team like one; the previous team's request is cancelled on change. */
export const useBasketballNextGameImpact = (
  conference: string | null,
  teamId: number | null,
) =>
  useQuery({
    queryKey: queryKeys.basketball.nextGameImpact(conference ?? "", teamId ?? 0),
    queryFn: ({ signal }) => fetchNextGameImpact(conference!, teamId!, signal),
    enabled: !!conference && !!teamId,
    retry: false,
    ...queryCachePolicy("scenario"),
  });
