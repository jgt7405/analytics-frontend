import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
  // Archive pages use self-referential canonical to maintain structure
  // while noindex prevents duplicate content issues
};

export default function ArchiveSeasonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
