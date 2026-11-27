import { bidTitle } from "@/components/features/basketball/BballCeiling";

describe("seed ceiling/floor logo hover text", () => {
  it("reads the backend's 0-1 fraction as a whole percent", () => {
    expect(bidTitle("Duke", 1)).toBe("Duke - 100% tournament bid");
    expect(bidTitle("Miami", 0.982)).toBe("Miami - 98% tournament bid");
    expect(bidTitle("NC State", 0.685)).toBe("NC State - 69% tournament bid");
    expect(bidTitle("Boston College", 0)).toBe("Boston College - 0% tournament bid");
    expect(bidTitle("X", undefined)).toBe("X - 0% tournament bid");
  });

  it("never rounds an uncertain chance to 100% or 0%", () => {
    expect(bidTitle("A", 0.996)).toBe("A - >99% tournament bid");
    expect(bidTitle("B", 0.004)).toBe("B - <1% tournament bid");
  });

  it("still accepts a 0-100 value", () => {
    expect(bidTitle("C", 45.6)).toBe("C - 46% tournament bid");
  });
});
