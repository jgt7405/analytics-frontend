import BballWinsContent from "@/app/basketball/wins/BballWinsContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

interface ArchiveWinsPageProps {
  params: Promise<{ season: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("basketball", "wins", season);
}

export default async function ArchiveWinsPage({
  params,
}: ArchiveWinsPageProps) {
  const { season } = await params;
  return <BballWinsContent season={season} />;
}
