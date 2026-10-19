import { Suspense } from "react";
import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { teamPageMetadata } from "@/app/metadata";
import PageLoading from "@/components/ui/PageLoading";
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
  // Legacy underscore slugs (e.g. /team/Sam_Houston) 404 against the backend,
  // which expects spaces. 301 them to the canonical encoded-space URL.
  if (teamName.includes("_")) {
    permanentRedirect(
      `/basketball/team/${encodeURIComponent(teamName.replace(/_/g, " "))}/`,
    );
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
