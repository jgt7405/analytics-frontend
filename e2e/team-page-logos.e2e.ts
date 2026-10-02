import { expect, test } from "@playwright/test";

// Team pages draw opponent logos in charts with plain <img> or SVG <image>;
// they use resizedLogoSrc (src/lib/logo-src.ts) so no original logo file
// (~500 px, median 30 kB) is downloaded (plan step 9).
for (const path of ["/basketball/team/Duke/", "/football/team/Alabama/"]) {
  test(`${path} downloads no full-size logo`, async ({ page }) => {
    const originals: string[] = [];
    page.on("request", (request) => {
      const { pathname } = new URL(request.url());
      if (/^\/images\/(team|conf)_logos\//.test(pathname)) originals.push(pathname);
    });
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(3000);
    expect(originals).toEqual([]);
  });
}
