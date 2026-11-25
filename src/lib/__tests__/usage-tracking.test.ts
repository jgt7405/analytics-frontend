/**
 * @jest-environment jsdom
 */
import { REQUEST_SCHEMAS } from "@/api/schemas";
import type { SiteUsageEvent } from "@/types/statistics";

const sendSiteUsageEvent = jest.fn();
const sendSiteUsageEvents = jest.fn();
jest.mock("@/services/statistics-api", () => ({
  sendSiteUsageEvent: (...args: unknown[]) => sendSiteUsageEvent(...args),
  sendSiteUsageEvents: (...args: unknown[]) => sendSiteUsageEvents(...args),
}));

import { controlName, deviceType, recordPageEvent, scrollPercent, trackCompare, trackError, trackFeature, trackWebVital } from "../usage-tracking";

const view = (path: string, viewId: string): SiteUsageEvent => ({
  event_type: "page_view", path, sport: "basketball", page: "wins",
  visitor_id: "0f2d6e9a-2576-4b36-8846-81b4f94566a1", session_id: "65380de9-0e14-40dd-9228-018c832666d1", view_id: viewId,
});
const sentEvents = () => sendSiteUsageEvents.mock.calls.flatMap(([events]) => events as SiteUsageEvent[]);

describe("deviceType", () => {
  it("tells phones, tablets and desktops apart", () => {
    expect(deviceType(390, true)).toBe("mobile");
    expect(deviceType(820, true)).toBe("tablet");
    expect(deviceType(1080, false)).toBe("desktop");
    expect(deviceType(500, false)).toBe("desktop");
  });
});

describe("scrollPercent", () => {
  it("counts a page that fits on screen as fully seen", () => {
    expect(scrollPercent(0, 800, 600)).toBe(100);
  });
  it("is the share of the scrollable height", () => {
    expect(scrollPercent(500, 800, 1800)).toBe(50);
    expect(scrollPercent(5000, 800, 1800)).toBe(100);
  });
});

describe("controlName", () => {
  it("prefers data-track, then the accessible label, then the text", () => {
    document.body.innerHTML = `
      <button data-track="Download table" aria-label="x">y</button>
      <button aria-label="Share this page">Share</button>
      <button>  Show   more  </button>
      <table><tr><th aria-sort="none">Win %</th></tr></table>
      <button></button>`;
    const [tracked, labelled, text, , empty] = Array.from(document.querySelectorAll("button, th"));
    expect(controlName(tracked)).toBe("Download table");
    expect(controlName(labelled)).toBe("Share this page");
    expect(controlName(text)).toBe("Show more");
    expect(controlName(document.querySelector("th")!)).toBe("Sort: Win %");
    expect(controlName(empty)).toBeNull();
  });
});

describe("recordPageEvent", () => {
  beforeEach(() => {
    sendSiteUsageEvent.mockClear();
    sendSiteUsageEvents.mockClear();
  });

  it("sends a page view at once with the device, and the page's other events when the next page starts", () => {
    recordPageEvent(view("/basketball/wins/", "11111111-1111-4111-8111-111111111111"));
    expect(sendSiteUsageEvent).toHaveBeenCalledWith(expect.objectContaining({ event_type: "page_view", device: expect.any(String), display_mode: "browser" }), undefined);

    trackFeature("Download table as image");
    trackWebVital("LCP", 1800);
    trackWebVital("CLS", Number.NaN);
    trackError("api_error", "basketball / standings (500)");
    expect(sendSiteUsageEvents).not.toHaveBeenCalled();

    recordPageEvent(view("/basketball/standings/", "22222222-2222-4222-8222-222222222222"));
    const events = sentEvents();
    // Time on page goes first when the clock moved at all, then the queue in order.
    expect(events.map((event) => event.event_type).filter((type) => type !== "page_exit")).toEqual(["feature", "web_vital", "error"]);
    expect(events.every((event) => event.path === "/basketball/wins/" && event.view_id === "11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(events.find((event) => event.event_type === "web_vital")).toMatchObject({ detail: "LCP", metric_value: 1800 });
  });

  it("sends a filter change straight through", () => {
    recordPageEvent({ ...view("/basketball/wins/", "33333333-3333-4333-8333-333333333333"), event_type: "filter_change" });
    expect(sendSiteUsageEvent).toHaveBeenCalledWith(expect.objectContaining({ event_type: "filter_change" }), undefined);
    expect(sendSiteUsageEvent.mock.calls[0][0]).not.toHaveProperty("device");
  });

  it("tracks outbound links without their query strings, and buttons by name", () => {
    recordPageEvent(view("/basketball/wins/", "44444444-4444-4444-8444-444444444444"));
    sendSiteUsageEvents.mockClear();
    document.body.innerHTML = `<a href="https://kenpom.com/team.php?team=Duke&t=secret">KenPom</a><a href="/basketball/seed/">Seed</a><button aria-label="Share this page">Share</button>`;
    document.querySelector<HTMLAnchorElement>("a[href^='https']")!.click();
    expect(sentEvents()).toEqual([expect.objectContaining({ event_type: "outbound", label: "https://kenpom.com/team.php" })]);
    sendSiteUsageEvents.mockClear();
    document.querySelector<HTMLAnchorElement>("a[href^='/']")!.addEventListener("click", (event) => event.preventDefault());
    document.querySelector<HTMLAnchorElement>("a[href^='/']")!.click();
    document.querySelector("button")!.click();
    // Hiding the tab sends what is queued.
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(sentEvents().filter((event) => event.event_type === "feature")).toEqual([expect.objectContaining({ detail: "Share this page" })]);
    expect(sentEvents().some((event) => event.event_type === "outbound")).toBe(false);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("only produces events the proxy accepts, alone or in a batch", () => {
    recordPageEvent(view("/basketball/wins/", "55555555-5555-4555-8555-555555555555"));
    trackFeature("Share this page");
    trackWebVital("INP", 120);
    trackCompare("basketball", ["Duke", "North Carolina"], "pick");
    trackError("not_found", "/basketball/nope/");
    const schema = REQUEST_SCHEMAS["basketball.statisticsEvent"];
    const events = sentEvents();
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) expect(schema.safeParse(event).success).toBe(true);
    expect(schema.safeParse({ events }).success).toBe(true);
    expect(schema.safeParse({ events: [] }).success).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({
      event_type: "compare", sport: "basketball", detail: "pick", teams: ["Duke", "North Carolina"],
      view_id: "55555555-5555-4555-8555-555555555555",
    }));
  });
});
