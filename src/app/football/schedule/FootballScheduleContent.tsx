"use client";

// Football schedule page = shared ScheduleContent + football config.
// Serves both the current page and the [season] archive page.

import ScheduleContent, {
  ScheduleContentConfig,
} from "@/components/features/shared/ScheduleContent";
import FootballScheduleTable from "@/components/features/football/ScheduleTable";
import { useFootballSchedule } from "@/hooks/useFootballSchedule";
import type { FootballScheduleResponse } from "@/types/football";

type Game = FootballScheduleResponse["data"][number];
type Summary = FootballScheduleResponse["summary"][string];

const FOOTBALL_SCHEDULE: ScheduleContentConfig<Game, Summary> = {
  sport: "football",
  pageId: "football-schedule",
  excludeConferences: ["Independent"],
  useScheduleData: useFootballSchedule,
  ScheduleTable: FootballScheduleTable,
};

export default function FootballScheduleContent(props: {
  season?: string;
  initialData?: FootballScheduleResponse;
}) {
  return <ScheduleContent config={FOOTBALL_SCHEDULE} {...props} />;
}
