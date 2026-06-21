"use client";

// Basketball TWV page = shared TWVContent + basketball config. Serves both
// the current page and the [season] archive page (via the season prop).

import TWVContent, {
  TWVContentConfig,
} from "@/components/features/shared/TWVContent";
import TWVTable from "@/components/features/basketball/TWVTable";
import { useTWV } from "@/hooks/useTWV";
import type { ComponentProps } from "react";

type TWVTeam = ComponentProps<typeof TWVTable>["twvData"][number];

const BASKETBALL_TWV: TWVContentConfig<TWVTeam> = {
  pageId: "twv",
  useTWVData: useTWV,
  TWVTable,
  explainerLines: [
    "TWV (True Win Value) shows actual wins compared to expected wins for a team ranked 50th by composite ratings based on kenpom, barttorvik and evanmiya",
    "Positive values indicate overperformance, negative values indicate underperformance relative to the 50th rated team.",
  ],
};

export default function BasketballTWVContent(props: { season?: string; initialData?: any }) {
  return <TWVContent config={BASKETBALL_TWV} {...props} />;
}
