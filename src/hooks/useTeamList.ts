import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { proxyUrl } from "@/lib/proxy-url";
import { queryCachePolicy } from "@/lib/cache-policy";

// A team as listed by /basketball_teams and /football_teams. Sport-specific
// columns (bid percentages etc.) vary, so they're left open.
export interface TeamListRow {
  team_name: string;
  logo_url: string;
  primary_color?: string;
  conference: string;
  overall_record?: string;
  conference_record?: string;
  [key: string]: unknown;
}

export interface TeamListResponse {
  data?: TeamListRow[];
}

const fetchTeamList = async (
  sport: "basketball" | "football",
  season: string | undefined,
): Promise<TeamListResponse> => {
  const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
  const response = await fetch(proxyUrl(`${sport}_teams${seasonQuery}`));
  if (!response.ok) throw new Error(`Failed to load ${sport} teams: ${response.status}`);
  return response.json();
};

/** Every team in a sport for a season (the current one when omitted). */
export const useTeamList = (sport: "basketball" | "football", season?: string) =>
  useQuery({
    queryKey: queryKeys[sport].teams(season),
    queryFn: () => fetchTeamList(sport, season),
    ...queryCachePolicy("referenceData"),
  });
