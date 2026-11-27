import { Suspense } from "react";
import Link from "next/link";
import { sportPageMetadata } from "@/app/metadata";
import { getFootballPlayoffRankingsServer } from "@/lib/server-api";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { detectMobileFromHeaders } from "@/lib/server-device";
import { conferenceLabel } from "@/lib/display-names";
import type { PlayoffRankingsResponse } from "@/types/football";
import JsonLd, { ORGANIZATION, SITE_URL, footballBreadcrumb } from "@/components/seo/JsonLd";
import FootballHomeContent from "./FootballHomeContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "home");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-11-27 08:11:22" -> { label: "November 27, 2026", iso: "2026-11-27" }.
 *  Parsed by hand so the server's time zone can't shift the day. */
function updatedDate(raw?: string) {
  const match = raw?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return {
    label: `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`,
    iso: `${year}-${month}-${day}`,
  };
}

// Plain-text summary of the projected field, server-rendered below the
// bracket. Searches for "cfp projections" and "projected cfp rankings" land
// here; the dated heading and list tell crawlers (and the search snippet) that
// the projection is current, which the client-drawn bracket alone doesn't.
function ProjectedFieldSummary({ data }: { data: PlayoffRankingsResponse }) {
  const updated = updatedDate(data.last_updated);
  const field = [...data.playoff_teams].sort((a, b) => a.rank - b.rank);
  if (field.length === 0) return null;
  return (
    <section className="container mx-auto px-4 pb-8">
      <div className="max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        <h2 className="mb-2 text-base font-bold text-slate-700 dark:text-slate-300">
          Projected College Football Playoff field
          {updated && (
            <>
              {" "}
              (updated <time dateTime={updated.iso}>{updated.label}</time>)
            </>
          )}
        </h2>
        <p className="mb-2">
          The {field.length} teams projected to make the College Football
          Playoff, in projected ranking order, from 1,000 simulated seasons
          {data.ranking?.basis === "committee"
            ? " that start from the committee's latest CFP rankings"
            : ""}
          :
        </p>
        <ol className="mb-2 list-decimal pl-5">
          {field.map((team) => (
            <li key={team.team_name}>
              {team.team_name} ({team.record}, {conferenceLabel("football", team.conference)})
              {team.bid_type === "Conference Champion" ? " - projected conference champion" : ""}
            </li>
          ))}
        </ol>
        <p>
          Each team&apos;s chance of making the playoff and reaching every round
          is on the <Link href="/football/cfp/" className="underline">CFP odds</Link>{" "}
          page. To see how results change the projected bracket, pick winners
          in the <Link href="/football/whatif/" className="underline">CFP simulator</Link>.
        </p>
      </div>
    </section>
  );
}

function structuredData(data?: PlayoffRankingsResponse) {
  const updated = updatedDate(data?.last_updated);
  return [
    footballBreadcrumb("CFP Projections", "/football/home/"),
    {
      "@context": "https://schema.org",
      "@type": "AnalysisNewsArticle",
      headline: "College Football Playoff Projections: Projected Field and Bracket",
      url: `${SITE_URL}/football/home/`,
      ...(updated ? { dateModified: updated.iso } : {}),
      author: ORGANIZATION,
      about: { "@type": "Thing", name: "College Football Playoff" },
    },
  ];
}

export default async function FootballHomePage() {
  const initialData = await getFootballPlayoffRankingsServer();
  const initialIsMobile = await detectMobileFromHeaders();
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <JsonLd data={structuredData(initialData)} />
      {/* The summary sits inside the content's boundary so it can't paint
          above the bracket and then get pushed down (layout shift). */}
      <Suspense fallback={null}>
        <FootballHomeContent initialData={initialData} />
        {initialData && <ProjectedFieldSummary data={initialData} />}
      </Suspense>
    </ResponsiveProvider>
  );
}
