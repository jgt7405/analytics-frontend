// src/hooks/useFootballConfChamp.ts
import { FootballConfChampApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

const fetchFootballConfChamp = async (
  conference: string
): Promise<FootballConfChampApiResponse> => {
  const encodedConference = encodeURIComponent(conference.replace(/\s+/g, "_"));

  // Use proxy instead of direct Railway call
  const response = await fetch(
    `/api/proxy/football/conf-champ/${encodedConference}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch football conference championship data");
  }

  return response.json();
};

export const useFootballConfChamp = (conference: string) => {
  return useQuery({
    queryKey: ["football-conf-champ", conference],
    queryFn: () => fetchFootballConfChamp(conference),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};
