import { expect, test } from "@playwright/test";

// Conference logo files are up to 268 kB (Southeastern) and shown at 20-48 px,
// so they go through the image optimizer (plan step 9). These pages must not
// fetch an original file from /images/conf_logos/.
for (const path of ["/football/team/Alabama/", "/basketball/2025-26/conf-data/"]) {
  test(`${path} loads conference logos resized`, async ({ page }) => {
    const originals: string[] = [];
    const resized: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname.startsWith("/images/conf_logos/")) originals.push(url.pathname);
      if (/^\/_next\/image\/?$/.test(url.pathname) && url.searchParams.get("url")?.startsWith("/images/conf_logos/")) {
        resized.push(url.searchParams.get("url") ?? "");
      }
    });
    await page.goto(path);
    await expect.poll(() => resized.length).toBeGreaterThan(0);
    await page.waitForTimeout(1000);
    expect(originals).toEqual([]);
  });
}

// The team page shows the conference logo at a fixed height and its own
// width (ACC is 3.4:1), so the file asked for must be at least that wide.
test("/basketball/team/Duke/ asks for a conference logo as wide as it is shown", async ({ page }) => {
  await page.goto("/basketball/team/Duke/");
  // The header swaps its phone and desktop layouts after hydration, so the
  // logo first found can be replaced or not yet laid out: measure until a
  // loaded logo has its final width.
  const measure = () =>
    page
      .locator('img[src*="conf_logos"]:visible')
      .first()
      .evaluate((img: HTMLImageElement) => ({
        requested: img.complete && img.currentSrc ? Number(new URL(img.currentSrc).searchParams.get("w")) : 0,
        needed: Math.ceil(img.getBoundingClientRect().width * window.devicePixelRatio),
      }))
      .catch(() => ({ requested: 0, needed: 0 }));
  await expect.poll(async () => (await measure()).needed).toBeGreaterThan(100);
  await expect.poll(async () => (await measure()).requested).toBeGreaterThan(0);
  const { requested, needed } = await measure();
  expect(requested).toBeGreaterThanOrEqual(needed);
});
