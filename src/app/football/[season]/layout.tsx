import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isArchivedSeason } from "@/config/seasons";

// Archive seasons are never indexed (docs/decisions/url-policy.md); each page
// sets its own title and self-canonical via sportPageMetadata.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

// Only seasons listed in src/config/seasons.ts have archive pages. The
// current season never gets here (next.config.ts redirects it to the
// seasonless URL); anything else is a 404.
export default async function ArchiveSeasonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  if (!isArchivedSeason("football", season)) notFound();
  return children;
}
