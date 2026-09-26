import { proxyUrl } from "../proxy-url";

describe("proxyUrl", () => {
  it("adds the trailing slash that avoids the 308 redirect", () => {
    expect(proxyUrl("football/standings/SEC")).toBe("/api/proxy/football/standings/SEC/");
  });

  it("keeps the query string after the slash", () => {
    expect(proxyUrl("twv/Big_12?season=2024-25")).toBe("/api/proxy/twv/Big_12/?season=2024-25");
    expect(proxyUrl("football/composite_ratings/history?date=2025-11-01&x=1")).toBe(
      "/api/proxy/football/composite_ratings/history/?date=2025-11-01&x=1",
    );
  });

  it("tolerates leading and trailing slashes in the input", () => {
    expect(proxyUrl("/standings/SEC/")).toBe("/api/proxy/standings/SEC/");
    expect(proxyUrl("/standings/SEC/?season=2025")).toBe("/api/proxy/standings/SEC/?season=2025");
  });

  it("keeps encoded segments intact", () => {
    expect(proxyUrl(`team/${encodeURIComponent("Texas A&M")}`)).toBe("/api/proxy/team/Texas%20A%26M/");
  });
});
