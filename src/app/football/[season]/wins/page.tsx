"use client";
import FootballWinsPage from "@/app/football/wins/page";

export default function ArchivedFootballWinsPage({
  params,
}: {
  params: { season: string };
}) {
  return <FootballWinsPage season={params.season} />;
}