import BballWinsContent from "@/app/basketball/wins/BballWinsContent";

interface ArchiveWinsPageProps {
  params: Promise<{ season: string }>;
}

export default async function ArchiveWinsPage({
  params,
}: ArchiveWinsPageProps) {
  const { season } = await params;
  return <BballWinsContent season={season} />;
}
