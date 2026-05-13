"use client";

import BballWinsContent from "@/app/basketball/wins/BballWinsContent";

interface ArchiveWinsPageProps {
  params: {
    season: string;
  };
}

export default function ArchiveWinsPage({
  params,
}: ArchiveWinsPageProps) {
  return <BballWinsContent season={params.season} />;
}
