"use client";

// Browser-only render of BasketballSeasonInfoContent. Next 16 no longer allows
// `dynamic(..., { ssr: false })` in a server component, so the page imports
// this client wrapper instead.
import dynamic from "next/dynamic";

const BasketballSeasonInfoContentClientOnly = dynamic(() => import("./BasketballSeasonInfoContent"), {
  ssr: false,
});

export default BasketballSeasonInfoContentClientOnly;
