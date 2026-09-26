import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { proxyUrl } from "@/lib/proxy-url";
import { queryCachePolicy } from "@/lib/cache-policy";

// One row of the bowl picks sheet: fixed game columns plus one
// "<Person> Winner" / "<Person> Points" pair per participant.
export interface BowlGameData {
  "#": string;
  "Bowl Name": string;
  "Team 1": string;
  "Team 2": string;
  Winner: string;
  Date: string;
  Time: string;
  "TV Station": string;
  [key: string]: string;
}

export interface BowlPicksResponse {
  games: BowlGameData[];
}

const fetchBowlPicks = async (): Promise<BowlPicksResponse> => {
  const response = await fetch(proxyUrl("football/bowl-picks"));
  if (!response.ok) throw new Error(`Failed to fetch bowl picks: ${response.status}`);
  return response.json();
};

/** Bowl picks and results. Shared by the table, scoreboard and projection
 *  chart on /football/bowlpicks, so the page makes one request. */
export const useFootballBowlPicks = () =>
  useQuery({
    queryKey: queryKeys.football.bowlPicks(),
    queryFn: fetchBowlPicks,
    ...queryCachePolicy("live"),
  });
