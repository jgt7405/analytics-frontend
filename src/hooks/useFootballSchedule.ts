// src/hooks/useFootballSchedule.ts
import { FootballScheduleResponse } from "@/types/football";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { proxyUrl } from "@/lib/proxy-url";
import { queryCachePolicy } from "@/lib/cache-policy";
import { logger } from "@/lib/logger";

const fetchFootballSchedule = async (
  conference: string,
  season?: string,
): Promise<FootballScheduleResponse> => {
  // ✅ FIXED: Format conference name like other football hooks
  const formattedConf = conference.replace(/\s+/g, "_");
  const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";

  logger.debug(
    `🏈 Getting football schedule for: ${conference} -> ${formattedConf}`,
  );

  // Use the correct proxy endpoint with formatted conference name
  const response = await fetch(
    proxyUrl(`football/conf_schedule/${formattedConf}${seasonQuery}`),
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch football schedule: ${response.statusText}`,
    );
  }

  const data = await response.json();

  // 🔍 ADD THESE DEBUG LOGS:
  logger.debug("🔍 FRONTEND: Raw API response data:", data);
  logger.debug("🔍 FRONTEND: Summary object:", data.summary);
  if (data.summary && data.summary.Arizona) {
    logger.debug("🔍 FRONTEND: Arizona summary:", data.summary.Arizona);
  }
  logger.debug(
    "🔍 FRONTEND: First few teams summary:",
    Object.entries(data.summary || {}).slice(0, 3),
  );

  return data;
};

export const useFootballSchedule = (
  conference: string,
  season?: string,
  initialData?: FootballScheduleResponse,
) => {
  return useQuery({
    queryKey: queryKeys.football.schedule(conference, season),
    initialData,
    queryFn: () => fetchFootballSchedule(conference, season),
    enabled: !!conference,
    ...queryCachePolicy("currentStandings"),
    refetchOnWindowFocus: false,
  });
};