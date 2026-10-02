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
