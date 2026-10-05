import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { detectMobileFromHeaders } from "@/lib/server-device";
import FootballSeasonInfoContent from "./FootballSeasonInfoContentClientOnly";

export const metadata = sportPageMetadata("football", "season-info");

// The content renders in the browser only, but its action buttons read the
// device on their first render; with the device from the User-Agent, phones
// get the stacked buttons from the start instead of side-by-side ones that
// stack a moment later.
export default async function FootballSeasonInfoPage() {
  const initialIsMobile = await detectMobileFromHeaders();
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <FootballSeasonInfoContent />
    </ResponsiveProvider>
  );
}
