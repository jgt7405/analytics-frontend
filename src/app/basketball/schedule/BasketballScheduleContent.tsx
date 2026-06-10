"use client";

// Basketball schedule page = shared ScheduleContent + basketball config.
// Serves both the current page and the [season] archive page.

import ScheduleContent, {
  ScheduleContentConfig,
} from "@/components/features/shared/ScheduleContent";
import BasketballScheduleTable from "@/components/features/basketball/ScheduleTable";
import { useSchedule } from "@/hooks/useSchedule";
import type { ScheduleApiResponse } from "@/types/basketball";

type Game = ScheduleApiResponse["data"][number];
type Summary = ScheduleApiResponse["summary"][string];

const BASKETBALL_SCHEDULE: ScheduleContentConfig<Game, Summary> = {
  sport: "basketball",
  pageId: "basketball-schedule",
  useScheduleData: useSchedule,
  ScheduleTable: BasketballScheduleTable,
};

export default function BasketballScheduleContent(props: {
  season?: string;
  initialData?: ScheduleApiResponse;
}) {
  return <ScheduleContent config={BASKETBALL_SCHEDULE} {...props} />;
}
