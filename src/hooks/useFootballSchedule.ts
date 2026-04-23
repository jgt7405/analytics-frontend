// src/hooks/useFootballSchedule.ts
import { FootballScheduleResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";

const fetchFootballSchedule = async (
  conference: string,
  season?: string,
): Promise<FootballScheduleResponse> => {
  // ✅ FIXED: Format conference name like other football hooks
  const formattedConf = conference.replace(/\s+/g, "_");
  const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";

  console.log(
    `🏈 Getting football schedule for: ${conference} -> ${formattedConf}`,
  );

  // Use the correct proxy endpoint with formatted conference name
  const response = await fetch(
    `/api/proxy/football/conf_schedule/${formattedConf}${seasonQuery}`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch football schedule: ${response.statusText}`,
    );
  }

  const data = await response.json();

  // 🔍 ADD THESE DEBUG LOGS:
  console.log("🔍 FRONTEND: Raw API response data:", data);
  console.log("🔍 FRONTEND: Summary object:", data.summary);
  if (data.summary && data.summary.Arizona) {
    console.log("🔍 FRONTEND: Arizona summary:", data.summary.Arizona);
  }
  console.log(
    "🔍 FRONTEND: First few teams summary:",
    Object.entries(data.summary || {}).slice(0, 3),
  );

  return data;
};

export const useFootballSchedule = (conference: string, season?: string) => {
  return useQuery({
    queryKey: ["football-schedule", conference, season],
    queryFn: () => fetchFootballSchedule(conference, season),
    enabled: !!conference,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};