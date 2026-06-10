"use client";

// Basketball seed page = shared SeedContent + basketball config (table +
// three current-season-only chart sections). Serves both the current page
// and the [season] archive page (which is table-only).

import SeedContent, {
  SeedContentConfig,
} from "@/components/features/shared/SeedContent";
import BballCeiling from "@/components/features/basketball/BballCeiling";
import BballSeedCeilingFloor from "@/components/features/basketball/BballSeedCeilingFloor";
import BballSeedWinsAndProbability from "@/components/features/basketball/BballSeedWinsAndProbability";
import SeedTable from "@/components/features/basketball/SeedTable";
import { useSeed } from "@/hooks/useSeed";
import type { SeedApiResponse } from "@/services/basketball-api";

// useSeed is useQuery<any> and the API row type differs structurally from
// SeedTable's own SeedTeam interface (known gotcha) — keep the generic loose
// and let the table components apply their own prop types.
/* eslint-disable @typescript-eslint/no-explicit-any */
type SeedRow = any;

const BASKETBALL_SEED: SeedContentConfig<SeedRow> = {
  pageId: "seed",
  title: "NCAA Tournament Seed Projections",
  skeletonTeamCols: 18,
  useSeedData: useSeed,
  renderTable: (data, ctx) => (
    <SeedTable
      seedData={data}
      showAllTeams={ctx.showAllTeams}
      season={ctx.season}
    />
  ),
  tableExplainer: [
    "NCAA tournament seed probabilities based on 1,000 simulations using composite ratings based on kenpom, barttorvik and evanmiya.",
    "Projections consider current resume, remaining schedule, and conference tournament outcomes.",
    <span key="featured">
      Featured in{" "}
      <a
        href="https://www.espn.com/mens-college-basketball/story/_/id/47809690/bubble-watch-mens-ncaa-tournament-march-madness-bracket-predictions-2026"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline"
      >
        ESPN Bubble Watch
      </a>{" "}
      and{" "}
      <a
        href="https://neilpaine.substack.com/p/2026-ncaa-tournament-forecast?open=false#%C2%A72025-26-ncaa-tournament-model-consensus"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline"
      >
        NCAA Tournament Model Consensus
      </a>
      .
    </span>,
  ],
  tableShareTitle: "NCAA Seed Analysis",
  extraSections: [
    {
      key: "ceiling",
      heading: "Tournament Seeding Ceiling/Floor",
      containerClass: "bball-ceiling-chart",
      pageName: "bball-ceiling",
      pageTitle: "Tournament Seeding Ceiling/Floor",
      shareTitle: "Tournament Seeding Ceiling/Floor Projections",
      explainer: [],
      render: (data) => <BballCeiling seedData={data} _maxHeight={600} />,
    },
    {
      key: "wins-ladder",
      heading: "Wins to Seed Ladder",
      containerClass: "bball-seed-wins-and-probability-chart",
      pageName: "seed-wins-probability",
      pageTitle: "Wins to Seed Ladder",
      shareTitle: "Wins to Seed Ladder",
      explainer: [],
      render: (_data, ctx) => (
        <BballSeedWinsAndProbability
          conference={ctx.selectedConference}
          _maxHeight={600}
        />
      ),
    },
    {
      key: "ceiling-floor",
      heading: "Seed Ceiling & Floor",
      containerClass: "seed-ceiling-floor-chart",
      pageName: "seed-ceiling-floor",
      pageTitle: "NCAA Seed Ceiling & Floor",
      shareTitle: "Seed Ceiling & Floor Projections",
      explainer: [
        "Seed ceiling and floor based on 1,000 season simulations using composite ratings from kenpom, barttorvik and evanmiya.",
        "Box shows 25th-75th percentile range, whiskers show 5th-95th percentile.",
      ],
      render: (data) => (
        <BballSeedCeilingFloor seedData={data} maxHeight={700} />
      ),
    },
  ],
};

export default function BasketballSeedContent(props: {
  season?: string;
  initialData?: SeedApiResponse;
}) {
  return <SeedContent config={BASKETBALL_SEED} {...props} />;
}
