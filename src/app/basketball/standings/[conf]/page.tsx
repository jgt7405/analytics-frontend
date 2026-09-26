import { permanentRedirect } from "next/navigation";

// Legacy redirect: an older URL scheme put the conference in the path
// (/basketball/standings/American_Athletic). The app now selects conference via
// a ?conf= query param, so those path URLs 404 in Google Search Console. 301
// them to the canonical query-param form (underscores -> spaces).
export default async function LegacyStandingsConfRedirect({
  params,
}: {
  params: Promise<{ conf: string }>;
}) {
  const { conf: slug } = await params;
  const conf = decodeURIComponent(slug).replace(/_/g, " ");
  permanentRedirect(`/basketball/standings/?conf=${encodeURIComponent(conf)}`);
}
