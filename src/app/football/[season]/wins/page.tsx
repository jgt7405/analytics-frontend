import FootballWinsContent from "@/app/football/wins/FootballWinsContent";

interface ArchiveFootballWinsPageProps {
  params: Promise<{ season: string }>;
}

export default async function ArchivedFootballWinsPage({
  params,
}: ArchiveFootballWinsPageProps) {
  const { season } = await params;
  return <FootballWinsContent season={season} />;
}