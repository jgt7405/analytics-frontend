import { whatIfConference, whatIfConferencePath } from "@/lib/whatif-conferences";

describe("whatIfConference", () => {
  it("accepts display names, stored names and underscores", () => {
    expect(whatIfConference("SEC")).toBe("SEC");
    expect(whatIfConference("Southeastern")).toBe("SEC");
    expect(whatIfConference("Big_12")).toBe("Big 12");
    expect(whatIfConference(["Mid-American"])).toBe("MAC");
  });

  it("rejects conferences without their own view", () => {
    expect(whatIfConference("Independent")).toBeNull();
    expect(whatIfConference("FCS")).toBeNull();
    expect(whatIfConference("nonsense")).toBeNull();
    expect(whatIfConference(undefined)).toBeNull();
  });

  it("builds an encoded path", () => {
    expect(whatIfConferencePath("Big 12")).toBe("/football/whatif/?conf=Big%2012");
  });
});
