// src/hooks/useFootballConfChamp.ts
import { FootballConfChampApiResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

export const useFootballConfChamp = (conference: string) => {
  return useQuery<FootballConfChampApiResponse, Error>({
    queryKey: ["football-conf-champ", conference],
    queryFn: async () => {
      console.log("Fetching football conf champ for:", conference);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/football/conf_champ/${conference}`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        console.log("Football conf champ API success:", result);
        return result;
      } catch (error) {
        console.error("Football conf champ API error:", error);
        throw error;
      }
    },
    enabled: !!conference,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
