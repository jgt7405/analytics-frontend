// src/hooks/useBasketballWhatIfConferences.ts - UPDATED

import { useQuery } from "@tanstack/react-query";

interface ConferencesResponse {
  success: boolean;
  conferences: string[];
  count: number;
}

export function useBasketballWhatIfConferences(season?: string) {
  return useQuery<string[]>({
    queryKey: ["basketball-whatif-conferences", season],
    queryFn: async () => {
      // Use dedicated endpoint that returns all 31 D1 conferences
      const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
      const response = await fetch(
        `/api/proxy/basketball/whatif/conferences${seasonQuery}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch basketball conferences");
      }

      const data: ConferencesResponse = await response.json();
      return data.conferences;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}