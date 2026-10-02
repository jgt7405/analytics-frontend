import { expect, test } from "@playwright/test";

// The compare pages' team picker shows every team's logo at 32 px. The logo
// files are ~500 px wide (median 30 kB), so they go through the image
// optimizer (plan step 9): about 1 kB each instead of the original file.
for (const path of ["/basketball/compare/", "/basketball/2025-26/compare/"]) {
  test(`${path} loads team logos resized`, async ({ page }) => {
    await page.goto(path);
    const logos = page.locator("button[title] img");
    await expect(logos.first()).toBeVisible();
    const srcs = await logos.evaluateAll((imgs) =>
      imgs.map((img) => (img as HTMLImageElement).currentSrc || img.getAttribute("src") || ""),
    );
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) expect(new URL(src, page.url()).pathname).toMatch(/^\/_next\/image\/?$/);
  });
}
