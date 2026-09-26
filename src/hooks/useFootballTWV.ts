import { FootballTWVApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { proxyUrl } from "@/lib/proxy-url";
import { queryCachePolicy } from "@/lib/cache-policy";

const fetchFootballTWV = async (
  conference: string,
  season?: string,
): Promise<FootballTWVApiResponse> => {
  const encodedConference = encodeURIComponent(conference.replace(/\s+/g, "_"));
  const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";

  const response = await fetch(proxyUrl(`football/twv/${encodedConference}${seasonQuery}`));

  if (!response.ok) {
    throw new Error("Failed to fetch football TWV data");
  }

  return response.json();
};

export const useFootballTWV = (conference: string, season?: string, initialData?: FootballTWVApiResponse) => {
  return useQuery({
    queryKey: queryKeys.football.twv(conference, season),
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: () => fetchFootballTWV(conference, season),
    ...queryCachePolicy("currentStandings"),
    refetchOnWindowFocus: false,
  });
};