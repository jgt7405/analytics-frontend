"use client";

import { sendSiteUsageEvent } from "@/services/statistics-api";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function PageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previous = useRef<{ path: string; search: string } | null>(null);
  const search = searchParams.toString();

  useEffect(() => {
    const prior = previous.current;
    if (prior?.path === pathname && prior.search === search) return;

    const parts = pathname.split("/").filter(Boolean);
    const sport = parts[0] === "basketball" || parts[0] === "football"
      ? parts[0]
      : null;
    const page = sport ? (parts[1] ?? "home") : (parts[0] ?? "home");
    const teamIndex = sport && parts[1] === "team" ? 2 : -1;
    const team = teamIndex >= 0 && parts[teamIndex]
      ? decodeURIComponent(parts[teamIndex]).replace(/-/g, " ")
      : null;

    sendSiteUsageEvent({
      event_type: prior?.path === pathname ? "filter_change" : "page_view",
      path: pathname,
      sport,
      page,
      conference: searchParams.get("conf"),
      team,
    });
    previous.current = { path: pathname, search };
  }, [pathname, search, searchParams]);

  return null;
}
