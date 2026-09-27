import { sportPageMetadata } from "@/app/metadata";

// The page is a client component, so its metadata lives here.
export const metadata = sportPageMetadata("basketball", "game-preview");

export default function GamePreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
