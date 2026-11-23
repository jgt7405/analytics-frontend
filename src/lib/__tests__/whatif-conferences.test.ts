import { whatIfConference, whatIfConferencePath, whatIfConferences } from "@/lib/whatif-conferences";

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

describe("basketball what-if conferences", () => {
  it("accepts display names and stored names", () => {
    expect(whatIfConference("Big East", "basketball")).toBe("Big East");
    expect(whatIfConference("West_Coast", "basketball")).toBe("WCC");
    expect(whatIfConference("Southern", "basketball")).toBe("SoCon");
    expect(whatIfConference("MAAC", "basketball")).toBe("Metro");
  });

  it("keeps the sports apart", () => {
    expect(whatIfConference("Big East", "football")).toBeNull();
    expect(whatIfConference("nonsense", "basketball")).toBeNull();
  });

  it("covers every conference the selector lists, by label", () => {
    for (const name of whatIfConferences("basketball")) {
      expect(whatIfConference(name, "basketball")).toBe(name);
    }
  });

  it("builds a basketball path", () => {
    expect(whatIfConferencePath("Big East", "basketball")).toBe("/basketball/whatif/?conf=Big%20East");
  });
});
