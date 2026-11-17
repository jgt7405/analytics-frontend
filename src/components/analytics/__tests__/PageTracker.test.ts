import { conferenceForTracking } from "../PageTracker";

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
