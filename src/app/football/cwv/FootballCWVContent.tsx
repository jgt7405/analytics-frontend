"use client";

// Football CWV page = shared CWVContent + football config. Serves both
// the current page and the [season] archive page (via the season prop).

import CWVContent, {
  CWVContentConfig,
} from "@/components/features/shared/CWVContent";
import CWVTable from "@/components/features/football/CWVTable";
import { useFootballCWV } from "@/hooks/useFootballCWV";
import type { FootballCWVApiResponse } from "@/types/football";

type FootballCWVData = FootballCWVApiResponse["data"];

const FOOTBALL_CWV: CWVContentConfig<FootballCWVData> = {
  pageId: "football-cwv",
  excludeConferences: ["Independent"],
  useCWVData: useFootballCWV,
  CWVTable,
  explainerLines: [
    "Conf Win Value (CWV) compares the actual wins to expected wins for a .500 team with that same schedule.",
    "Games are ordered from lowest to highest win probability.",
    "This only reflects past results, not future projections or predictions of final standings.",
  ],
};

export default function FootballCWVContent(props: {
  season?: string;
  initialData?: FootballCWVApiResponse;
}) {
  return <CWVContent config={FOOTBALL_CWV} {...props} />;
}
