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
};

export default function FootballCWVContent(props: {
  season?: string;
  initialData?: FootballCWVApiResponse;
}) {
  return <CWVContent config={FOOTBALL_CWV} {...props} />;
}
