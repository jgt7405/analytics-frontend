import { Metadata } from "next";

export const baseMetadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://jthom-analytics.vercel.app"
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
  verification: {
    google: [
      process.env.GOOGLE_VERIFICATION_ID,
      process.env.GOOGLE_SEARCH_CONSOLE_VERIFICATION,
    ].filter(Boolean) as string[],
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
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
