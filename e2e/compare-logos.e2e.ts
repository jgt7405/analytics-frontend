import { expect, test } from "@playwright/test";

// The compare pages' team picker shows every team's logo at 32 px. The logo
// files are ~500 px wide (median 30 kB), so they go through the image
// optimizer (plan step 9): about 1 kB each instead of the original file.
for (const path of [
  "/basketball/compare/",
  "/basketball/2025-26/compare/",
  "/football/compare/",
  "/football/2025-26/compare/",
]) {
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

// Picking a team draws its schedule (compare-schedules' TeamColumn): the
// team's logo and every opponent's, with plain <img>. They use
// resizedLogoSrc, so no original logo file is downloaded.
for (const [path, team] of [
  ["/basketball/compare/", "Duke"],
  ["/football/compare/", "Alabama"],
]) {
  test(`${path} schedule columns load no full-size logo`, async ({ page }) => {
    const originals: string[] = [];
    page.on("request", (request) => {
      const { pathname } = new URL(request.url());
      if (/^\/images\/(team|conf)_logos\//.test(pathname)) originals.push(pathname);
    });
    await page.goto(path);
    await page.locator(`button[title="${team}"]`).first().click();
    const opponentLogos = page.locator('img[src*="team_logos"]');
    await expect(opponentLogos.nth(3)).toBeAttached();
    await page.waitForTimeout(2000);
    expect(originals).toEqual([]);
  });
}
