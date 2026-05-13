"use client";
import FootballWinsContent from "@/app/football/wins/FootballWinsContent";

interface ArchiveFootballWinsPageProps {
  params: {
    season: string;
  };
}

export default function ArchivedFootballWinsPage({
  params,
}: ArchiveFootballWinsPageProps) {
  return <FootballWinsContent season={params.season} />;
}