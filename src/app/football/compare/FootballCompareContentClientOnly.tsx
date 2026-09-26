"use client";

// Browser-only render of FootballCompareContent. Next 16 no longer allows
// `dynamic(..., { ssr: false })` in a server component, so the page imports
// this client wrapper instead.
import dynamic from "next/dynamic";

const FootballCompareContentClientOnly = dynamic(() => import("./FootballCompareContent"), {
  ssr: false,
});

export default FootballCompareContentClientOnly;
