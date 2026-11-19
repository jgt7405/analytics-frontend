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

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const ENTRY_KEY = "jthom-anonymous-session-entry";

function bareHost(host: string) {
  return host.toLowerCase().replace(/^www\./, "");
}

/**
 * Where this visit came from, sent with its first page view only. The
 * referrer keeps its scheme, host and path; its query string and fragment
 * (where tokens and personal details travel) never leave the browser. A
 * referrer from this site itself (a reload, or a link opened in a new tab)
 * is not a source.
 */
export function entryAttribution(referrer: string, ownHost: string, searchParams: URLSearchParams) {
  let source: string | null = null;
  if (referrer) {
    try {
      const url = new URL(referrer);
      if (bareHost(url.hostname) !== bareHost(ownHost)) {
        source = `${url.protocol}//${url.host}${url.pathname}`.slice(0, 500);
      }
    } catch {
      source = null;
    }
  }
  const tags = Object.fromEntries(
    UTM_KEYS.map((key) => [key, searchParams.get(key)?.trim().slice(0, 100) || null]),
  ) as Record<(typeof UTM_KEYS)[number], string | null>;
  return { referrer: source, ...tags };
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

    const eventType = prior?.path === pathname ? "filter_change" : "page_view";
    // The first page view of a browser-tab session carries the visit's source.
    const isEntry = eventType === "page_view" && !sessionStorage.getItem(ENTRY_KEY);
    if (isEntry) sessionStorage.setItem(ENTRY_KEY, "1");

    sendSiteUsageEvent({
      event_type: eventType,
      path: pathname,
      sport,
      page,
      conference: conferenceForTracking(page, searchParams),
      team,
      visitor_id: visitorId,
      session_id: sessionId,
      ...(isEntry
        ? { entry: true, ...entryAttribution(document.referrer, window.location.hostname, searchParams) }
        : {}),
    });
    previous.current = { path: pathname, search };
  }, [pathname, search, searchParams]);

  return null;
}
