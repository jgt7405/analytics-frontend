import { apiUrl } from "@/api/urls";
import { entryAttribution } from "@/lib/visit-source";
import type { SiteStatisticsInsights, SiteStatisticsResponse, SiteUsageEvent, VisitContext } from "@/types/statistics";

const ENTRY_KEY = "jthom-anonymous-session-entry";

/** The first page view of a browser-tab session carries the visit's source. */
export function withVisitSource(event: SiteUsageEvent, visit?: VisitContext): SiteUsageEvent {
  if (!visit || event.event_type !== "page_view") return event;
  try {
    if (sessionStorage.getItem(ENTRY_KEY)) return event;
    sessionStorage.setItem(ENTRY_KEY, "1");
  } catch {
    return event;
  }
  return { ...event, entry: true, ...entryAttribution(visit.referrer, visit.host, new URLSearchParams(visit.search)) };
}

export async function getSiteStatistics(days: string, sport: string, scope: string, dimension?: string, value?: string, dimension2?: string, value2?: string): Promise<SiteStatisticsResponse> {
  const response = await fetch(
    apiUrl("basketball.statisticsAnalysis", {}, { days, sport, scope, dimension, value, dimension2, value2 }),
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`Statistics request failed: ${response.status}`);
  return response.json() as Promise<SiteStatisticsResponse>;
}

export async function getSiteStatisticsInsights(days: string, sport: string, scope: string, dimension?: string, value?: string, dimension2?: string, value2?: string): Promise<SiteStatisticsInsights> {
  const response = await fetch(
    apiUrl("basketball.statisticsInsights", {}, { days, sport, scope, dimension, value, dimension2, value2 }),
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`Statistics insights request failed: ${response.status}`);
  return response.json() as Promise<SiteStatisticsInsights>;
}

/** Several events in one request (src/lib/usage-tracking.ts batches the
 *  events that describe a page and sends them when the page is left). */
export function sendSiteUsageEvents(events: SiteUsageEvent[]): void {
  if (!events.length) return;
  void fetch(apiUrl("basketball.statisticsEvent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(events.length === 1 ? events[0] : { events }),
    keepalive: true,
  })
    .then((response) => response.text())
    .catch(() => undefined);
}

export function sendSiteUsageEvent(event: SiteUsageEvent, visit?: VisitContext): void {
  void fetch(apiUrl("basketball.statisticsEvent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withVisitSource(event, visit)),
    keepalive: true,
  })
    // Read the (tiny) reply: until its body is consumed, Chromium keeps the
    // request open, so the page never reaches network idle (each smoke test
    // then waited out its 10 s cap).
    .then((response) => response.text())
    .catch(() => undefined);
}
