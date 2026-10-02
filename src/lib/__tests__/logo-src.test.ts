// jest.setup.js stubs next/image for component tests; this needs the real
// getImageProps to check resizedLogoSrc against it.
jest.unmock("next/image");

import { getImageProps } from "next/image";
import nextConfig from "../../../next.config";
import { OPTIMIZER_WIDTHS, resizedLogoSrc } from "../logo-src";

describe("resizedLogoSrc", () => {
  it("routes local logo files through the image optimizer at 2x", () => {
    const url = resizedLogoSrc("/images/team_logos/duke.png", 32);
    expect(url).toBe("/_next/image/?url=%2Fimages%2Fteam_logos%2Fduke.png&w=64&q=75");
  });

  it("gives the same src as next/image for a square of that size", () => {
    for (const px of [12, 16, 20, 24, 28, 32, 48]) {
      const src = "/images/conf_logos/Big_Ten.png";
      const expected = getImageProps({ src, alt: "", width: px, height: px }).props.src;
      // Under Jest, Next doesn't see next.config.ts's trailingSlash: true,
      // which only adds the slash before "?".
      expect(resizedLogoSrc(src, px)).toBe(expected.replace("/_next/image?", "/_next/image/?"));
    }
  });

  it("uses the widths and trailing slash configured in next.config.ts", () => {
    const { imageSizes = [], deviceSizes = [] } = nextConfig.images ?? {};
    expect(OPTIMIZER_WIDTHS).toEqual([...imageSizes, ...deviceSizes].sort((a, b) => a - b));
    expect(nextConfig.trailingSlash).toBe(true);
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
