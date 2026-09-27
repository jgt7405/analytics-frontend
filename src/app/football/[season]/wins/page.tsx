import FootballWinsContent from "@/app/football/wins/FootballWinsContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

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

export default async function ArchivedFootballWinsPage({
  params,
}: ArchiveFootballWinsPageProps) {
  const { season } = await params;
  return <FootballWinsContent season={season} />;
}