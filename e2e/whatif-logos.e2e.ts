import { expect, test } from "@playwright/test";

// The basketball what-if page draws every game's and team's logo with a
// plain <img> (whatif/icons.tsx TeamLogo, GameCard): 46 original files,
// 1.75 MB, with the fixtures. They use resizedLogoSrc (plan step 9), so no
// original logo file is downloaded.
test("/basketball/whatif/ downloads no full-size logo", async ({ page }) => {
  const originals: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (/^\/images\/(team|conf)_logos\//.test(pathname)) originals.push(pathname);
  });
  await page.goto("/basketball/whatif/");
  await expect(page.locator('img[src*="team_logos"]').nth(10)).toBeAttached();
  await page.waitForTimeout(2000);
  expect(originals).toEqual([]);
});
