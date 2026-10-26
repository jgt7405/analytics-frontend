import { Suspense } from "react";
import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { teamPageMetadata } from "@/app/metadata";
import PageLoading from "@/components/ui/PageLoading";
import { teamPagePath } from "@/lib/display-names";
import { getFootballTeamPageServer, isListedTeam } from "@/lib/server-api";
import FootballTeamContent from "./FootballTeamContent";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamname: string }>;
}): Promise<Metadata> {
  const { teamname } = await params;
  return teamPageMetadata("football", teamname);
}

export default async function FootballTeamPage({
  params,
}: {
  params: Promise<{ teamname: string }>;
}) {
  const { teamname } = await params;
  const teamName = decodeURIComponent(teamname);
  // One 301 to the canonical URL: legacy underscore slugs (e.g.
  // /team/Sam_Houston; the backend expects spaces) and stored names that
  // have a display name (/team/New%20Orleans/ -> /team/LSU%20New%20Orleans/,
  // src/config/display-names.ts) both go there.
  const canonicalPath = teamPagePath("football", teamName.replace(/_/g, " "));
  if (canonicalPath !== `/football/team/${encodeURIComponent(teamName)}/`) {
    permanentRedirect(canonicalPath);
  }
  // A team page streams: a click shows the skeleton at once and the data
  // follows. Only a name the (cached) team list doesn't have waits for the
  // backend, so an unknown team still gets a real 404.
  if ((await isListedTeam("football", teamName)) !== false) {
    return (
      <Suspense fallback={<PageLoading />}>
        <FootballTeam teamname={teamname} teamName={teamName} />
      </Suspense>
    );
  }
  return <FootballTeam teamname={teamname} teamName={teamName} />;
}

// Without the data (the backend didn't answer in time) the page still
// renders, and the browser fetches it.
async function FootballTeam({ teamname, teamName }: { teamname: string; teamName: string }) {
  const { data, missing } = await getFootballTeamPageServer(teamName);
  if (missing) notFound();
  // Strip the league-wide all_schedule_data from the SSR payload — it's only
  // used by client-side charts, which refetch the full dataset on mount (see
  // initialDataUpdatedAt in useFootballTeam). Keeps the crawlable HTML light.
  const initialData = data && { ...data, all_schedule_data: undefined };
  return (
    <Suspense fallback={null}>
      <FootballTeamContent params={{ teamname }} initialData={initialData} />
    </Suspense>
  );
}
