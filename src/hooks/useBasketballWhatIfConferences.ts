// src/hooks/useBasketballWhatIfConferences.ts - UPDATED

import { useQuery } from "@tanstack/react-query";

interface ConferencesResponse {
  success: boolean;
  conferences: string[];
  count: number;
}

export function useBasketballWhatIfConferences() {
  return useQuery<string[]>({
    queryKey: ["basketball-whatif-conferences"],
    queryFn: async () => {
      // Use dedicated endpoint that returns all 31 D1 conferences
      const response = await fetch("/api/proxy/basketball/whatif/conferences");

      if (!response.ok) {
        throw new Error("Failed to fetch basketball conferences");
      }

      const data: ConferencesResponse = await response.json();
      return data.conferences;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
