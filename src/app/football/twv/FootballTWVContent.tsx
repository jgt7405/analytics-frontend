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
  tableTitle: "True Win Value (TWV)",
  useTWVData: useFootballTWV,
  TWVTable: FootballTWVTable,
  allTeamsValues: ["All Teams", "Group of 6"],
  explainerLines: [
    "TWV (True Win Value) shows actual wins compared to expected wins for the 12th rated team in composite ratings.",
    "Positive values indicate overperformance, negative values indicate underperformance relative to the 12th rated team.",
    "TWV 50 Wins credits each win against how likely the 50th rated team would have been to win that game. TWV 1 Losses charges each loss against how likely the top rated team would have been to win it.",
    "CFP TWV adds the two together. It is the value used to rank teams for the CFP projections.",
  ],
};

export default function FootballTWVContent(props: {
  season?: string;
  initialData?: any;
  initialConference?: string;
}) {
  return <TWVContent config={FOOTBALL_TWV} {...props} />;
}
