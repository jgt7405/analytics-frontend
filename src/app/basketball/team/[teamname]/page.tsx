import { Suspense } from "react";
import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { teamPageMetadata } from "@/app/metadata";
import PageLoading from "@/components/ui/PageLoading";
import { teamPagePath } from "@/lib/display-names";
import { getBasketballTeamPageServer, isListedTeam } from "@/lib/server-api";
import BasketballTeamContent from "./BasketballTeamContent";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamname: string }>;
}): Promise<Metadata> {
  const { teamname } = await params;
  return teamPageMetadata("basketball", teamname);
}

export default async function BasketballTeamPage({
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
  const canonicalPath = teamPagePath("basketball", teamName.replace(/_/g, " "));
  if (canonicalPath !== `/basketball/team/${encodeURIComponent(teamName)}/`) {
    permanentRedirect(canonicalPath);
  }
  // A team page streams: a click shows the skeleton at once and the data
  // follows. Only a name the (cached) team list doesn't have waits for the
  // backend, so an unknown team still gets a real 404 instead of a 200
  // soft-404.
  if ((await isListedTeam("basketball", teamName)) !== false) {
    return (
      <Suspense fallback={<PageLoading />}>
        <BasketballTeam teamname={teamname} teamName={teamName} />
      </Suspense>
    );
  }
  return <BasketballTeam teamname={teamname} teamName={teamName} />;
}

// Without the data (the backend didn't answer in time) the page still
// renders, and the browser fetches it.
async function BasketballTeam({ teamname, teamName }: { teamname: string; teamName: string }) {
  const { data, missing } = await getBasketballTeamPageServer(teamName);
  if (missing) notFound();
  return (
    <Suspense fallback={null}>
      <BasketballTeamContent params={{ teamname }} initialData={data} />
    </Suspense>
  );
}
