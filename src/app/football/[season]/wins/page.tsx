"use client";
import FootballWinsPage from "@/app/football/wins/page";

// Generate static params for recent seasons to improve SEO and performance
export async function generateStaticParams() {
  try {
    return [
      { season: '2025-26' },
      { season: '2024-25' },
      { season: '2023-24' },
    ];
  } catch (error) {
    console.error('Error generating static params:', error);
    return [
      { season: '2025-26' },
      { season: '2024-25' },
    ];
  }
}

export default function ArchivedFootballWinsPage({
  params,
}: {
  params: { season: string };
}) {
  return <FootballWinsPage season={params.season} />;
}