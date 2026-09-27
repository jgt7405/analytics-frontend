import { sportPageMetadata } from "@/app/metadata";

// Not indexed (src/config/sports.ts: indexed: false), so sportPageMetadata
// sets robots noindex, follow.
export const metadata = sportPageMetadata("basketball", "chart");

export default function ChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
