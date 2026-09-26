import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { proxyUrl } from "@/lib/proxy-url";
import { queryCachePolicy } from "@/lib/cache-policy";

interface TeamInfo {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface CFPBidPoint {
  date: string;
  team_name: string;
  cfp_bid_pct: number;
  team_info?: TeamInfo;
}

export interface CFPSeedPoint {
  date: string;
  team_name: string;
  average_seed: number;
  team_info?: TeamInfo;
}

export interface TeamCFPHistoryResponse {
  cfp_bid_data?: CFPBidPoint[];
  average_seed_data?: CFPSeedPoint[];
}

const fetchTeamCFPHistory = async (teamName: string): Promise<TeamCFPHistoryResponse> => {
  const response = await fetch(
    proxyUrl(`football/cfp/${encodeURIComponent(teamName)}/history`),
  );
  if (!response.ok) throw new Error("Failed to fetch CFP bid history");
  return response.json();
};

/** A team's CFP bid probability and average seed over time. Not
 *  season-filtered by the backend; callers trim to the season's window. */
export const useFootballTeamCFPHistory = (teamName: string) =>
  useQuery({
    queryKey: queryKeys.football.teamCfpHistory(teamName),
    queryFn: () => fetchTeamCFPHistory(teamName),
    enabled: !!teamName,
    ...queryCachePolicy("historical"),
  });
