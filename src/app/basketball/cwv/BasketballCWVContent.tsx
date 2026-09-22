"use client";

// Basketball CWV page = shared CWVContent + basketball config. Serves both
// the current page and the [season] archive page (via the season prop).

import CWVContent, {
  CWVContentConfig,
} from "@/components/features/shared/CWVContent";
import CWVTable from "@/components/features/basketball/CWVTable";
import { useCWV } from "@/hooks/useCWV";
import type { CWVApiResponse } from "@/types/basketball";

type CWVData = CWVApiResponse["data"];

const BASKETBALL_CWV: CWVContentConfig<CWVData> = {
  pageId: "cwv",
  tableTitle: "Conference Win Value (CWV)",
  useCWVData: useCWV,
  CWVTable,
  explainerLines: [
    "Conf Win Value (CWV) compares the actual wins to expected wins for a .500 team with that same schedule.",
    "Games are ordered from lowest to highest win probability.",
    "This only reflects past results, not future projections or predictions of final standings.",
  ],
};

export default function BasketballCWVContent(props: {
  season?: string;
  initialData?: CWVApiResponse;
}) {
  return <CWVContent config={BASKETBALL_CWV} {...props} />;
}
