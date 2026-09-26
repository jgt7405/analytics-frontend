"use client";

// Browser-only render of FootballSeasonInfoContent. Next 16 no longer allows
// `dynamic(..., { ssr: false })` in a server component, so the page imports
// this client wrapper instead.
import dynamic from "next/dynamic";

const FootballSeasonInfoContentClientOnly = dynamic(() => import("./FootballSeasonInfoContent"), {
  ssr: false,
});

export default FootballSeasonInfoContentClientOnly;
