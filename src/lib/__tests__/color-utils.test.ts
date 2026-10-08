import { getCellColor, readableTextColor } from "../color-utils";

describe("readableTextColor", () => {
  it("keeps the preferred color when it reaches 4.5:1", () => {
    expect(readableTextColor(255, 255, 255, "#1f2937")).toBe("#1f2937");
    expect(readableTextColor(24, 98, 123, "#ffffff")).toBe("#ffffff");
  });

  it("falls back to black or white on mid-tone tiles", () => {
    // Tiles axe flagged: white 4.06:1 and dark gray 4.49:1.
    expect(readableTextColor(0x49, 0x86, 0x9b, "#ffffff")).toBe("#000000");
    expect(readableTextColor(0x5f, 0x96, 0xaa, "#1f2937")).toBe("#000000");
  });
});

describe("getCellColor", () => {
  it("gives every blue intensity text with at least 4.5:1 contrast", () => {
    const lum = (rgb: number[]) =>
      rgb
        .map((c) => c / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const parse = (css: string) =>
      css.startsWith("#")
        ? [1, 3, 5].map((i) => parseInt(css.slice(i, i + 2), 16))
        : css.match(/\d+/g)!.map(Number);
    for (let value = 1; value <= 100; value++) {
      const { backgroundColor, color } = getCellColor(value, "blue");
      const [a, b] = [lum(parse(backgroundColor)), lum(parse(color))];
      expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
