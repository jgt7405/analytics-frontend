import { sportPageMetadata } from "@/app/metadata";

// Not indexed (src/config/sports.ts: indexed: false), so sportPageMetadata
// sets robots noindex, follow.
export const metadata = sportPageMetadata("football", "bowlpicks");

export default function BowlPicksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
