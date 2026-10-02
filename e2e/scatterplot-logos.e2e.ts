import { expect, test } from "@playwright/test";

// The custom scatterplot (/basketball/chart/) draws one logo per uploaded
// team, 20-100 px (default 44). They go through the image optimizer at
// that size (plan step 9), so no original logo file is downloaded.
const CHART_CSV = [
  "Offense vs Defense,Offensive Rating,Defensive Rating",
  "Duke,121.4,92.8",
  "North Carolina,117.2,97.5",
  "Kansas,115.8,94.1",
].join("\n");

test("/basketball/chart/ draws uploaded teams' logos resized", async ({ page }) => {
  const originals: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (/^\/images\/(team|conf)_logos\//.test(pathname)) originals.push(pathname);
  });
  await page.goto("/basketball/chart/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "chart.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(CHART_CSV),
  });
  const logo = page.locator('img[alt="Duke"]').first();
  await expect(logo).toHaveJSProperty("complete", true);
  const { requested, needed } = await logo.evaluate((img: HTMLImageElement) => ({
    requested: Number(new URL(img.currentSrc).searchParams.get("w")),
    needed: Math.ceil(img.getBoundingClientRect().width * window.devicePixelRatio),
  }));
  expect(requested).toBeGreaterThanOrEqual(needed);
  await page.waitForTimeout(1000);
  expect(originals).toEqual([]);
});
