// src/hooks/useNCAATeam.ts
import { api } from "@/services/api";
import type { NCAATeamApiResponse } from "@/types/basketball";
import { useQuery } from "@tanstack/react-query";

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
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};