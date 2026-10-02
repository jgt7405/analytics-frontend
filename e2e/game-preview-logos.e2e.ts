import { expect, test } from "@playwright/test";

// The game preview's schedule columns and next-game impact rows drew
// opponent logos with a plain <img> of the original file (4 files, 195 kB
// with the fixtures) at 14-16 px. They use resizedLogoSrc (plan step 9),
// so no original logo file is downloaded.
test("/basketball/game-preview/ downloads no full-size logo", async ({ page }) => {
  const originals: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (/^\/images\/(team|conf)_logos\//.test(pathname)) originals.push(pathname);
  });
  await page.goto("/basketball/game-preview/?game=fixture-1");
  await expect(page.locator('img[src*="team_logos"]').nth(5)).toBeAttached();
  for (let y = 0; y < 4; y++) {
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);
  expect(originals).toEqual([]);
});
