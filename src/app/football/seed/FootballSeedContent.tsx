"use client";

// Football seed page = shared SeedContent + football config (table only).
// Serves both the current page and the [season] archive page.

import SeedContent, {
  SeedContentConfig,
} from "@/components/features/shared/SeedContent";
import FootballSeedTable from "@/components/features/football/FootballSeedTable";
import { useFootballSeed } from "@/hooks/useFootballSeed";
import type { FootballSeedApiResponse } from "@/types/football";

// Use the API response's row type (what the hook actually returns); the
// table component's own prop type is assignable from it.
type FootballSeedRow = FootballSeedApiResponse["data"][number];

const FOOTBALL_SEED: SeedContentConfig<FootballSeedRow> = {
  pageId: "football-seed",
  title: "CFP Seed Projections",
  skeletonTeamCols: 15,
  useSeedData: useFootballSeed,
  renderTable: (data, ctx) => (
    <FootballSeedTable
      seedData={data}
      className="seed-table"
      showAllTeams={ctx.showAllTeams}
      season={ctx.season}
    />
  ),
  tableExplainer: [
    "CFP seed distribution probabilities based on 1,000 season simulations using composite of multiple college football rating models.",
    "Darker colors indicate higher probabilities.",
  ],
  tableShareTitle: "Football CFP Seed Analysis",
};

export default function FootballSeedContent(props: {
  season?: string;
  initialData?: FootballSeedApiResponse;
}) {
  return <SeedContent config={FOOTBALL_SEED} {...props} />;
}
