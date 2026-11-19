import { withVisitSource } from "../statistics-api";
import type { SiteUsageEvent } from "@/types/statistics";

const view: SiteUsageEvent = { event_type: "page_view", path: "/basketball/wins/" };
const fromReddit = { referrer: "https://www.reddit.com/r/CFB/?x=1", host: "www.jthomanalytics.com", search: "utm_campaign=bowl" };

describe("withVisitSource", () => {
  beforeEach(() => sessionStorage.clear());

  it("adds the source to the first page view of a tab session only", () => {
    expect(withVisitSource(view, fromReddit)).toMatchObject({
      entry: true, referrer: "https://www.reddit.com/r/CFB/", utm_campaign: "bowl",
    });
    expect(withVisitSource(view, fromReddit)).toEqual(view);
  });

  it("leaves filter changes and events without context alone", () => {
    expect(withVisitSource({ ...view, event_type: "filter_change" }, fromReddit)).not.toHaveProperty("entry");
    expect(withVisitSource(view)).toEqual(view);
    // Neither used up the session's entry.
    expect(withVisitSource(view, fromReddit)).toHaveProperty("entry", true);
  });
});
