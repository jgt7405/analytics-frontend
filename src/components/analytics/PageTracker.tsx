"use client";

import type { SiteUsageEvent, VisitContext } from "@/types/statistics";
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

/** Whether the conference counted is the page's default (no conference in
 *  the URL) rather than one the visitor chose; undefined when there is none. */
export function conferenceIsDefault(page: string, searchParams: URLSearchParams) {
  if (searchParams.get("conf") ?? searchParams.get("teamConf")) return false;
  return CONFERENCE_FILTER_PAGES.has(page) ? true : undefined;
}

function anonymousId(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}

// The sender is loaded on first use rather than imported: it pulls in the
// backend endpoint list, which would otherwise ship in the root layout and add
// up to 3.4 kB of first-load JS to every page (the lightest pages went over
// their bundle budgets). Events are sent after hydration either way. Working
// out a visit's source happens in the sender too, for the same reason, as
// does the rest of the usage tracking (time on page, clicks, web vitals,
// errors: src/lib/usage-tracking.ts).
function sendEvent(event: SiteUsageEvent, visit?: VisitContext) {
  void import("@/lib/usage-tracking")
    .then(({ recordPageEvent }) => recordPageEvent(event, visit))
    .catch(() => undefined);
}

export function PageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previous = useRef<{ path: string; search: string; viewId: string } | null>(null);
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

    const eventType = prior?.path === pathname ? "filter_change" : "page_view";
    const viewId = eventType === "page_view" || !prior ? crypto.randomUUID() : prior.viewId;
    // The referrer and query are read now: by the time the sender loads, the
    // visitor may have moved on.
    sendEvent({
      event_type: eventType,
      path: pathname,
      sport,
      page,
      conference: conferenceForTracking(page, searchParams),
      team,
      visitor_id: visitorId,
      session_id: sessionId,
      view_id: viewId,
      conference_defaulted: conferenceIsDefault(page, searchParams),
    }, eventType === "page_view" ? { referrer: document.referrer, host: window.location.hostname, search } : undefined);
    previous.current = { path: pathname, search, viewId };
  }, [pathname, search, searchParams]);

  return null;
}
