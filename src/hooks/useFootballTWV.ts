// src/hooks/useFootballTWV.ts
import { FootballTWVApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

const fetchFootballTWV = async (
  conference: string,
  season?: string,
): Promise<FootballTWVApiResponse> => {
  const encodedConference = encodeURIComponent(conference.replace(/\s+/g, "_"));
  const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";

  // Call Railway backend directly (same as your basketball routes)
  const response = await fetch(`/api/proxy/football/twv/${encodedConference}${seasonQuery}`);

  if (!response.ok) {
    throw new Error("Failed to fetch football TWV data");
  }

  return response.json();
};

export const useFootballTWV = (conference: string, season?: string) => {
  return useQuery({
    queryKey: ["football-twv", conference, season],
    queryFn: () => fetchFootballTWV(conference, season),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};