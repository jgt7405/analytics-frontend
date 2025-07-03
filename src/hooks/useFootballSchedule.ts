import { FootballScheduleResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

const fetchFootballSchedule = async (
  conference: string
): Promise<FootballScheduleResponse> => {
  // Use your Railway backend URL
  const response = await fetch(`/api/proxy/football/schedule/${conference}`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch football schedule: ${response.statusText}`
    );
  }
  return response.json();
};

export const useFootballSchedule = (conference: string) => {
  return useQuery({
    queryKey: ["football-schedule", conference],
    queryFn: () => fetchFootballSchedule(conference),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
