import { Metadata } from "next";
import type { Sport } from "@/config/seasons";
import { SPORTS, sportPage, sportPagePath } from "@/config/sports";

export const baseMetadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.jthomanalytics.com"
  ),
  title: {
    default: "JThom Analytics - Sports analytics your eyes will love",
    template: "%s | JThom Analytics",
  },
  description:
    "Sports analytics your eyes will love. Advanced basketball and football analytics with projections, standings predictions, and conference win value analysis.",
  keywords: [
    "basketball analytics",
    "football analytics",
    "college basketball",
    "college football",
    "sports predictions",
    "sports analytics",
    "basketball statistics",
    "football statistics",
    "conference standings",
    "win projections",
    "sports data",
  ],
  authors: [{ name: "JThom Analytics" }],
  creator: "JThom Analytics",
  publisher: "JThom Analytics",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "JThom Analytics",
    title: "JThom Analytics - Sports analytics your eyes will love",
    description:
      "Sports analytics your eyes will love. Advanced basketball and football analytics with projections.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JThom Analytics Sports Data",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JThom Analytics - Sports analytics your eyes will love",
    description:
      "Sports analytics your eyes will love. Advanced basketball and football analytics with projections.",
    images: ["/og-image.png"],
    creator: "@jthom_analytics",
  },
  icons: {
    icon: "/images/favicon.ico",
    shortcut: "/images/favicon-16x16.png",
    apple: "/images/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export function generatePageMetadata({
  title,
  description,
  path,
  conference,
}: {
  title: string;
  description: string;
  path: string;
  conference?: string;
}): Metadata {
  const fullTitle = conference ? `${conference} ${title}` : title;
  const fullDescription = conference
    ? `${description} View detailed analytics for ${conference} teams.`
    : description;

  return {
    title: fullTitle,
    description: fullDescription,
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: path,
    },
    twitter: {
      title: fullTitle,
      description: fullDescription,
    },
    alternates: {
      canonical: path,
    },
  };
}

const ARCHIVE_ROBOTS = { index: false, follow: true } as const;

/**
 * Metadata for a page in src/config/sports.ts, for the current season or an
 * archived one (docs/decisions/url-policy.md). Every page gets a
 * self-referential canonical; archive pages add the season to the title and
 * are `noindex`, as are pages the config marks unindexed.
 */
export function sportPageMetadata(sport: Sport, slug: string, season?: string | null): Metadata {
  const page = sportPage(sport, slug);
  if (!page?.title || !page.description) {
    throw new Error(`No title/description for ${sport}/${slug} in src/config/sports.ts`);
  }
  if (!season) {
    const metadata = generatePageMetadata({
      title: page.title,
      description: page.description,
      path: sportPagePath(sport, slug),
    });
    return page.indexed ? metadata : { ...metadata, robots: ARCHIVE_ROBOTS };
  }
  return {
    ...generatePageMetadata({
      title: `${season} ${page.title}`,
      description: `${season} season archive. ${page.description}`,
      path: sportPagePath(sport, slug, season),
    }),
    robots: ARCHIVE_ROBOTS,
  };
}

/** Metadata for a team page, current season or archived (`noindex`). */
export function teamPageMetadata(
  sport: Sport,
  teamSlug: string,
  season?: string | null,
): Metadata {
  const teamName = decodeURIComponent(teamSlug).replace(/_/g, " ");
  const description =
    sport === "football"
      ? `${teamName} football analytics including schedule, CFP projections, standings history, win probabilities, and advanced team statistics.`
      : `${teamName} basketball analytics including schedule, tournament projections, standings history, win probabilities, and NCAA tournament seeding.`;
  const path = `/${sport}${season ? `/${season}` : ""}/team/${teamSlug}/`;
  const title = `${teamName} ${SPORTS[sport].label} Analytics & Projections`;
  if (!season) return generatePageMetadata({ title, description, path });
  return {
    ...generatePageMetadata({
      title: `${season} ${title}`,
      description: `${season} season archive. ${description}`,
      path,
    }),
    robots: ARCHIVE_ROBOTS,
  };
}
