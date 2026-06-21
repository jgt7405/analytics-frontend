"use client";

// Football TWV page = shared TWVContent + football config. Serves both
// the current page and the [season] archive page (via the season prop).

import TWVContent, {
  TWVContentConfig,
} from "@/components/features/shared/TWVContent";
import FootballTWVTable from "@/components/features/football/FootballTWVTable";
import { useFootballTWV } from "@/hooks/useFootballTWV";
import type { ComponentProps } from "react";

type FootballTWVTeam = ComponentProps<typeof FootballTWVTable>["twvData"][number];

const FOOTBALL_TWV: TWVContentConfig<FootballTWVTeam> = {
  pageId: "football-twv",
  useTWVData: useFootballTWV,
  TWVTable: FootballTWVTable,
  explainerLines: [
    "TWV (True Win Value) shows actual wins compared to expected wins for the 12th rated team in composite ratings.",
    "Positive values indicate overperformance, negative values indicate underperformance relative to the 12th rated team.",
  ],
};

export default function FootballTWVContent(props: { season?: string; initialData?: any }) {
  return <TWVContent config={FOOTBALL_TWV} {...props} />;
}
