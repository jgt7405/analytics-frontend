// The archive page is a client component, so its metadata lives here.
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "compare", season);
}

export default function ArchivePageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
