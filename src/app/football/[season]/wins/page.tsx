import FootballWinsContent from "@/app/football/wins/FootballWinsContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";
import { getFootballStandingsServer } from "@/lib/server-api";

interface ArchiveFootballWinsPageProps {
  params: Promise<{ season: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "wins", season);
}

// Like the current-season page, the default conference is fetched on the
// server so the first paint has the table (step 9 archive pilot).
export default async function ArchivedFootballWinsPage({
  params,
}: ArchiveFootballWinsPageProps) {
  const { season } = await params;
  const initialData = await getFootballStandingsServer("Big 12", season);
  return <FootballWinsContent season={season} initialData={initialData} />;
}
