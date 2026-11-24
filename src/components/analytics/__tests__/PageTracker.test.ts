import { entryAttribution } from "@/lib/visit-source";
import { conferenceForTracking, conferenceIsDefault } from "../PageTracker";

describe("conferenceForTracking", () => {
  it("counts Big 12 when a conference page first loads without a query", () => {
    expect(conferenceForTracking("wins", new URLSearchParams())).toBe("Big 12");
  });

  it("counts the explicitly selected conference", () => {
    expect(conferenceForTracking("standings", new URLSearchParams("conf=SEC"))).toBe("SEC");
  });

  it("counts a switch back to the default conference", () => {
    expect(conferenceForTracking("schedule", new URLSearchParams())).toBe("Big 12");
  });

  it("does not assign Big 12 to pages without a conference filter", () => {
    expect(conferenceForTracking("home", new URLSearchParams())).toBeNull();
  });
});

describe("conferenceIsDefault", () => {
  it("flags the page's default conference, so chosen conferences can be counted apart", () => {
    expect(conferenceIsDefault("wins", new URLSearchParams())).toBe(true);
    expect(conferenceIsDefault("wins", new URLSearchParams("conf=SEC"))).toBe(false);
    expect(conferenceIsDefault("team", new URLSearchParams("teamConf=Big+12"))).toBe(false);
    expect(conferenceIsDefault("home", new URLSearchParams())).toBeUndefined();
  });
});

describe("entryAttribution", () => {
  const none = { utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null };

  it("keeps an outside referrer's host and path but drops its query and fragment", () => {
    expect(entryAttribution("https://www.reddit.com/r/CFB/comments/abc/?share=1#top", "www.jthomanalytics.com", new URLSearchParams()))
      .toEqual({ referrer: "https://www.reddit.com/r/CFB/comments/abc/", ...none });
  });

  it("ignores this site as a referrer, with or without www", () => {
    expect(entryAttribution("https://jthomanalytics.com/basketball/wins/", "www.jthomanalytics.com", new URLSearchParams()).referrer).toBeNull();
  });

  it("treats a missing or malformed referrer as direct", () => {
    expect(entryAttribution("", "www.jthomanalytics.com", new URLSearchParams()).referrer).toBeNull();
    expect(entryAttribution("not a url", "www.jthomanalytics.com", new URLSearchParams()).referrer).toBeNull();
  });

  it("reads utm tags from the landing URL", () => {
    expect(entryAttribution("", "www.jthomanalytics.com", new URLSearchParams("utm_source=twitter&utm_campaign=bowl+picks&utm_medium=")))
      .toEqual({ referrer: null, ...none, utm_source: "twitter", utm_campaign: "bowl picks" });
  });

  it("keeps Android app referrers", () => {
    expect(entryAttribution("android-app://com.reddit.frontpage/", "www.jthomanalytics.com", new URLSearchParams()).referrer)
      .toBe("android-app://com.reddit.frontpage/");
  });
});
