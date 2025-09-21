// hooks/useFootballTeamHistory.ts
import { useQuery } from "@tanstack/react-query";

export const useFootballTeamHistory = (teamName: string) => {
  return useQuery({
    queryKey: ["football-team-history", teamName],
    queryFn: async () => {
      const [confWinsResponse, cfpHistoryResponse] = await Promise.all([
        fetch(
          `/api/proxy/football/team/${encodeURIComponent(teamName)}/history/conf_wins`
        ),
        fetch(
          `/api/proxy/football/cfp/${encodeURIComponent(teamName)}/history`
        ),
      ]);

      if (!confWinsResponse.ok || !cfpHistoryResponse.ok) {
        throw new Error("Failed to fetch team history data");
      }

      const [confWinsData, cfpHistoryData] = await Promise.all([
        confWinsResponse.json(),
        cfpHistoryResponse.json(),
      ]);

      return {
        confWins: confWinsData,
        cfpHistory: cfpHistoryData,
      };
    },
    enabled: !!teamName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};
