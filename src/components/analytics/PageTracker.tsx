"use client";

import { sendSiteUsageEvent } from "@/services/statistics-api";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const CONFERENCE_FILTER_PAGES = new Set([
  "composite-ratings",
  "conf-champ",
  "conf-data",
  "conf-tourney",
  "cwv",
  "ncaa-tourney",
  "schedule",
  "seed",
  "standings",
  "teams",
  "twv",
  "whatif",
  "wins",
]);

export function conferenceForTracking(page: string, searchParams: URLSearchParams) {
  return searchParams.get("conf")
    ?? searchParams.get("teamConf")
    ?? (CONFERENCE_FILTER_PAGES.has(page) ? "Big 12" : null);
}

function anonymousId(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}

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
    const visitorId = anonymousId(localStorage, "jthom-anonymous-visitor");
    const sessionId = anonymousId(sessionStorage, "jthom-anonymous-session");

    sendSiteUsageEvent({
      event_type: prior?.path === pathname ? "filter_change" : "page_view",
      path: pathname,
      sport,
      page,
      conference: conferenceForTracking(page, searchParams),
      team,
      visitor_id: visitorId,
      session_id: sessionId,
    });
    previous.current = { path: pathname, search };
  }, [pathname, search, searchParams]);

  return null;
}
