import { FootballTWVApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

const fetchFootballTWV = async (
  conference: string,
  season?: string,
): Promise<FootballTWVApiResponse> => {
  const response = await fetch(
    apiUrl("football.twv", { conference: conference.replace(/\s+/g, "_") }, { season }),
  );

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