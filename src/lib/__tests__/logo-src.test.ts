// jest.setup.js stubs next/image for component tests; this needs the real
// getImageProps.
jest.unmock("next/image");

import { resizedLogoSrc } from "../logo-src";

describe("resizedLogoSrc", () => {
  it("routes local logo files through the image optimizer at 2x", () => {
    const url = resizedLogoSrc("/images/team_logos/duke.png", 32);
    expect(url).toMatch(/^\/_next\/image\/?\?/);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("url")).toBe("/images/team_logos/duke.png");
    expect(Number(params.get("w"))).toBeGreaterThanOrEqual(64);
  });

  it("leaves other URLs alone", () => {
    expect(resizedLogoSrc("https://example.com/logo.png", 32)).toBe(
      "https://example.com/logo.png",
    );
    expect(resizedLogoSrc("data:image/png;base64,AAAA", 32)).toBe(
      "data:image/png;base64,AAAA",
    );
  });

  it("passes through empty values", () => {
    expect(resizedLogoSrc(undefined, 32)).toBeUndefined();
    expect(resizedLogoSrc("", 32)).toBeUndefined();
  });
});
