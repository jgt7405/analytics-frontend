import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import nextConfig from "../../../next.config";
import { resizedLogoSrc } from "../logo-src";

describe("resizedLogoSrc", () => {
  it("uses local logo files as they are", () => {
    expect(resizedLogoSrc("/images/team_logos/duke.png", 32)).toBe(
      "/images/team_logos/duke.png",
    );
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

// Logos are served without the image optimizer (next.config.ts), so a logo
// file committed at full size goes to every visitor at full size. Run
// `node scripts/shrink-logos.mjs` after adding one.
describe("logo files", () => {
  it("are served without the image optimizer", () => {
    expect(nextConfig.images?.unoptimized).toBe(true);
  });

  const PUBLIC = join(__dirname, "../../../public/images");
  const LIMITS = [
    { folder: "team_logos", width: 128, height: 128 },
    { folder: "conf_logos", width: 600, height: 128 },
  ];

  for (const { folder, width, height } of LIMITS) {
    it(`in ${folder} fit ${width}x${height} and 40 kB`, () => {
      const oversized: string[] = [];
      for (const name of readdirSync(join(PUBLIC, folder))) {
        // compare_*.png in team_logos is a saved chart export, not a logo.
        if (!name.endsWith(".png") || name.startsWith("compare_")) continue;
        const file = readFileSync(join(PUBLIC, folder, name));
        // PNG IHDR: width and height are the big-endian uint32s at 16 and 20.
        const w = file.readUInt32BE(16);
        const h = file.readUInt32BE(20);
        if (w > width || h > height || file.length > 40 * 1024) {
          oversized.push(`${name} (${w}x${h}, ${Math.round(file.length / 1024)} kB)`);
        }
      }
      expect(oversized).toEqual([]);
    });
  }
});
