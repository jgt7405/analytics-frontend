import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";
import { Suspense } from "react";
import Link from "next/link";
import FootballWhatIfContent from "@/components/features/football/whatif";
import {
  WHATIF_CONFERENCES,
  whatIfConference,
  whatIfConferencePath,
} from "@/lib/whatif-conferences";
import JsonLd, {
  ORGANIZATION,
  SITE_URL,
  footballBreadcrumb,
} from "@/components/seo/JsonLd";

// Rendered per request so useSearchParams resolves on the server and the HTML
// carries the page's heading and copy. Statically rendered, the whole page sat
// behind the Suspense fallback and the server HTML had no text at all.
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BASE_METADATA: Metadata = {
  ...sportPageMetadata("football", "whatif"),
  keywords: [
    "CFP simulator",
    "college football playoff simulator",
    "CFP odds calculator",
    "football what-if scenarios",
    "playoff impact calculator",
    "college football simulator",
    "conference standings simulator",
    "game outcome simulator",
  ],
  openGraph: {
    title: "College Football What-If Simulator",
    description: "Simulate game outcomes and see the instant impact on CFP seeding and playoff odds",
    url: "/football/whatif/",
  },
  twitter: {
    title: "College Football What-If Simulator",
    description: "Simulate game outcomes to see CFP impact",
  },
};

// Title, description and canonical from src/config/sports.ts. A ?conf= naming
// an FBS conference (src/lib/whatif-conferences.ts) is its own page with its
// own title and a self-referencing canonical; any other ?conf= value
// canonicalizes to the plain page.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const conference = whatIfConference((await searchParams).conf);
  if (!conference) return BASE_METADATA;
  const title = `${conference} Championship Scenarios Calculator & CFP Simulator`;
  const description = `Pick winners of the remaining ${conference} games and see each team's chances of reaching the ${conference} Championship Game and making the College Football Playoff, with ${conference} tiebreakers applied.`;
  const path = whatIfConferencePath(conference);
  return {
    ...BASE_METADATA,
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
    twitter: { title, description },
  };
}

const STRUCTURED_DATA = [
  footballBreadcrumb("What-If Simulator", "/football/whatif/"),
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "College Football Playoff What-If Simulator",
    description:
      "Pick the winners of upcoming college football games and see how each team's odds of reaching its conference title game and the College Football Playoff change.",
    applicationCategory: "SportsApplication",
    url: `${SITE_URL}/football/whatif/`,
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: ORGANIZATION,
  },
];

// Plain-language description of the tool, below it. Server-rendered so search
// engines can tell what the page does without running the simulator.
function AboutSimulator() {
  return (
    <section className="container mx-auto px-4 pb-8">
      <div className="max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        <h2 className="mb-2 text-base font-bold text-slate-700 dark:text-slate-300">
          How the CFP simulator works
        </h2>
        <p className="mb-2">
          Choose a conference, then pick winners for any of its remaining games
          (or switch to all FBS games, or search for specific teams). Press
          calculate and the season is re-simulated with your results locked in.
          The results show each team&apos;s chance of reaching its conference
          championship game and making the 12-team College Football Playoff,
          before and after your picks.
        </p>
        <p className="mb-2">
          Every game you don&apos;t pick is played out using win probabilities
          from a composite of college football rating models, across 1,000
          simulated seasons, and conference title-game spots follow each
          conference&apos;s own tiebreaker rules.
        </p>
        <p>
          The game impact board shows which games in the next seven days move
          playoff odds the most. Current projections without any picks are on
          the <Link href="/football/cfp/" className="underline">CFP projections</Link>{" "}
          and <Link href="/football/home/" className="underline">playoff field</Link>{" "}
          pages.
        </p>
        <h2 className="mb-2 mt-4 text-base font-bold text-slate-700 dark:text-slate-300">
          Conference championship scenarios
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {WHATIF_CONFERENCES.map((name) => (
            <li key={name}>
              <Link href={whatIfConferencePath(name)} className="underline">
                {name} championship scenarios
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default async function FootballWhatIfPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const conference = whatIfConference((await searchParams).conf);
  return (
    <>
      <JsonLd data={STRUCTURED_DATA} />
      <Suspense fallback={null}>
        <FootballWhatIfContent initialConference={conference} />
      </Suspense>
      <AboutSimulator />
    </>
  );
}
