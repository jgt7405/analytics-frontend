// Anonymous usage tracking for the site statistics page, beyond page views:
// time on page and scroll depth, buttons and links used, web vitals and
// errors. Loaded by PageTracker after a page view is sent (never in first-load
// JS). Events that describe a page wait in a queue and go out together, in one
// request, when the visitor leaves the page or hides the tab.
//
// Nothing personal is sent: ids are random and kept in this browser, link
// URLs lose their query strings, and the backend keeps only a bot flag from
// the user agent and a country/region from Vercel's geolocation headers.

// Imported here (not through next/web-vitals in a component) so it loads
// with this chunk rather than in every page's first-load JS.
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import { sendSiteUsageEvent, sendSiteUsageEvents } from "@/services/statistics-api";
import type { SiteUsageEvent, VisitContext } from "@/types/statistics";

type View = Pick<SiteUsageEvent, "path" | "sport" | "page" | "team" | "visitor_id" | "session_id"> & { view_id: string };
type PageEvent = Omit<SiteUsageEvent, "path" | "sport" | "page" | "team" | "visitor_id" | "session_id" | "view_id">;

const MAX_BATCH = 25;
/** A page that throws in a loop shouldn't send hundreds of errors. */
const MAX_ERRORS_PER_VIEW = 10;
const SCROLL_SAMPLE_DELAY_MS = 1500;

let current: View | null = null;
let visibleSince: number | null = null;
let engagedMs = 0;
let maxScroll = 0;
let errorsThisView = 0;
let queue: SiteUsageEvent[] = [];
let listening = false;
let scrollFrame = 0;

/** Phone, tablet or desktop, from the screen's short side and whether the
 *  main pointer is a finger. */
export function deviceType(shortSide: number, coarsePointer: boolean): "mobile" | "tablet" | "desktop" {
  if (coarsePointer && shortSide < 600) return "mobile";
  if (coarsePointer && shortSide < 1100) return "tablet";
  return "desktop";
}

function pageEnvironment(): Partial<SiteUsageEvent> {
  try {
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return {
      device: deviceType(Math.min(window.screen.width, window.screen.height), coarse),
      display_mode: standalone ? "standalone" : "browser",
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone?.slice(0, 64) ?? null,
      ...(navigator.webdriver ? { automated: true } : {}),
    };
  } catch {
    return {};
  }
}

/** Percentage of the page scrolled through (100 when it all fits). */
export function scrollPercent(scrollY: number, viewportHeight: number, pageHeight: number) {
  const scrollable = pageHeight - viewportHeight;
  if (scrollable <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((scrollY / scrollable) * 100)));
}

function currentScroll() {
  return scrollPercent(window.scrollY, window.innerHeight, document.documentElement.scrollHeight);
}

function pauseClock() {
  if (visibleSince !== null) {
    engagedMs += performance.now() - visibleSince;
    visibleSince = null;
  }
}

function resumeClock() {
  if (document.visibilityState === "visible" && visibleSince === null) visibleSince = performance.now();
}

function sendQueue() {
  const events = queue;
  queue = [];
  for (let i = 0; i < events.length; i += MAX_BATCH) sendSiteUsageEvents(events.slice(i, i + MAX_BATCH));
}

/** Sends the time spent on the current page so far, and everything queued. */
function flush() {
  pauseClock();
  if (current && engagedMs >= 1) {
    queue.unshift({ ...current, event_type: "page_exit", engaged_ms: Math.round(engagedMs), scroll_pct: maxScroll });
  }
  engagedMs = 0;
  sendQueue();
  resumeClock();
}

function enqueue(event: PageEvent & Partial<Pick<SiteUsageEvent, "sport">>) {
  const base = current ?? { path: window.location.pathname };
  queue.push({ ...base, ...event } as SiteUsageEvent);
  if (queue.length >= MAX_BATCH) sendQueue();
}

export function trackFeature(name: string) {
  const detail = name.replace(/\s+/g, " ").trim().slice(0, 80);
  if (detail) enqueue({ event_type: "feature", detail });
}

/** A team joined a Compare Schedules comparison. `teams` is the comparison
 *  at that moment in selection order, ending with the team just added. The
 *  sport is sent too: a team can be added before the page view is recorded. */
export function trackCompare(sport: "basketball" | "football", teams: string[], method: "pick" | "rank") {
  if (teams.length) enqueue({ event_type: "compare", sport, detail: method, teams });
}

export function trackError(kind: "js_error" | "api_error" | "not_found", message?: string) {
  if (errorsThisView >= MAX_ERRORS_PER_VIEW) return;
  errorsThisView += 1;
  enqueue({ event_type: "error", detail: kind, label: message?.slice(0, 200) ?? null });
  // A missing page is often the last thing a visitor sees here.
  if (kind === "not_found") sendQueue();
}

export function trackWebVital(name: string, value: number) {
  if (Number.isFinite(value)) enqueue({ event_type: "web_vital", detail: name, metric_value: value });
}

/** The name a control is counted under: its data-track attribute, else its
 *  accessible label, else its text. Sort headers are prefixed "Sort: ". */
export function controlName(element: Element): string | null {
  const label = element.getAttribute("data-track")
    ?? element.getAttribute("aria-label")
    ?? element.textContent
    ?? "";
  const name = label.replace(/\s+/g, " ").trim().slice(0, 70);
  if (!name) return null;
  return element.matches("th[aria-sort]") ? `Sort: ${name}` : name;
}

function onClick(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target : null;
  const element = target?.closest("a[href], button, [role='button'], [data-track], th[aria-sort], summary");
  if (!element || element.matches(":disabled, [aria-disabled='true']")) return;
  if (element instanceof HTMLAnchorElement && !element.hasAttribute("data-track")) {
    let url: URL;
    try {
      url = new URL(element.href, window.location.href);
    } catch {
      return;
    }
    if (element.hasAttribute("download")) {
      trackFeature(`Download: ${controlName(element) ?? "file"}`);
    } else if (/^https?:$/.test(url.protocol) && url.host !== window.location.host) {
      // The query string can carry tokens; the backend drops it too.
      enqueue({ event_type: "outbound", label: `${url.origin}${url.pathname}`.slice(0, 500) });
      // Leaving in this tab hides the page, which flushes; a new tab doesn't.
      sendQueue();
    }
    // Links within the site show up as the next page view.
    return;
  }
  const name = controlName(element);
  if (name) trackFeature(name);
}

function onScroll() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    maxScroll = Math.max(maxScroll, currentScroll());
  });
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") flush();
  else resumeClock();
}

function listen() {
  if (listening) return;
  listening = true;
  document.addEventListener("click", onClick, { capture: true, passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", flush);
  window.addEventListener("error", (event) => {
    trackError("js_error", event.message || "Script error");
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = event.reason;
    trackError("js_error", reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection"));
  });
  window.addEventListener("appinstalled", () => trackFeature("App installed"));
  const reportVital = (metric: Metric) => trackWebVital(metric.name, metric.value);
  try {
    for (const observe of [onCLS, onFCP, onINP, onLCP, onTTFB]) observe(reportVital);
  } catch {
    // Browsers without the Performance APIs it needs: no vitals, nothing else lost.
  }
}

/** Called by PageTracker for each page view and filter change. A page view
 *  ends the previous view (sending its time on page) and starts a new one. */
export function recordPageEvent(event: SiteUsageEvent, visit?: VisitContext) {
  if (event.event_type !== "page_view" || !event.view_id) {
    sendSiteUsageEvent(event, visit);
    return;
  }
  sendSiteUsageEvent({ ...event, ...pageEnvironment() }, visit);
  listen();
  flush();
  current = {
    path: event.path, sport: event.sport, page: event.page, team: event.team,
    visitor_id: event.visitor_id, session_id: event.session_id, view_id: event.view_id,
  };
  engagedMs = 0;
  maxScroll = 0;
  errorsThisView = 0;
  visibleSince = null;
  resumeClock();
  // Sample once the page has rendered, so a page that needs no scrolling
  // counts as fully seen.
  const viewId = event.view_id;
  window.setTimeout(() => {
    if (current?.view_id === viewId) maxScroll = Math.max(maxScroll, currentScroll());
  }, SCROLL_SAMPLE_DELAY_MS);
}
