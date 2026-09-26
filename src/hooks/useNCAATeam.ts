// src/hooks/useNCAATeam.ts
import { api } from "@/services/api";
import type { NCAATeamApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";
import { queryCachePolicy } from "@/lib/cache-policy";

export const useNCAATeam = (
  conference: string,
  season?: string,
  initialData?: NCAATeamApiResponse,
) => {
  return useQuery({
    queryKey: ["ncaa-tourney", conference, season],
    initialData,
    queryFn: () => api.getNCAATourney(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    retry: 3,
  });
};