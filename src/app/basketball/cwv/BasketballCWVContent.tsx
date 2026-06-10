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
  useCWVData: useCWV,
  CWVTable,
};

export default function BasketballCWVContent(props: {
  season?: string;
  initialData?: CWVApiResponse;
}) {
  return <CWVContent config={BASKETBALL_CWV} {...props} />;
}
