import { redirect } from "next/navigation";
import { HOME_SPORT } from "@/config/seasons";
import { sportPagePath } from "@/config/sports";

// Fallback only: next.config.ts redirects / (307) before this page renders.
export default function HomePage() {
  redirect(sportPagePath(HOME_SPORT, "wins"));
}
