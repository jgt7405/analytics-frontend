import { permanentRedirect } from "next/navigation";

// Legacy redirect: an older URL scheme put the conference in the path
// (/basketball/standings/American_Athletic). The app now selects conference via
// a ?conf= query param, so those path URLs 404 in Google Search Console. 301
// them to the canonical query-param form (underscores -> spaces).
export default function LegacyStandingsConfRedirect({
  params,
}: {
  params: { conf: string };
}) {
  const conf = decodeURIComponent(params.conf).replace(/_/g, " ");
  permanentRedirect(`/basketball/standings/?conf=${encodeURIComponent(conf)}`);
}
