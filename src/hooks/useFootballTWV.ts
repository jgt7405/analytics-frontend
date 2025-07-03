// src/hooks/useFootballTWV.ts
import { FootballTWVApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

const fetchFootballTWV = async (
  conference: string
): Promise<FootballTWVApiResponse> => {
  const encodedConference = encodeURIComponent(conference.replace(/\s+/g, "_"));

  // Call Railway backend directly (same as your basketball routes)
  const response = await fetch(`/api/proxy/football/twv/${encodedConference}`);

  if (!response.ok) {
    throw new Error("Failed to fetch football TWV data");
  }

  return response.json();
};

export const useFootballTWV = (conference: string) => {
  return useQuery({
    queryKey: ["football-twv", conference],
    queryFn: () => fetchFootballTWV(conference),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};
