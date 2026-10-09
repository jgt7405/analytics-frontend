import { expect, test, type Page } from "@playwright/test";

// Logos are served straight from public/images, already shrunk to the size
// the site shows them at (scripts/shrink-logos.mjs; next.config.ts has
// images.unoptimized). Before, every logo went through the image optimizer,
// which on a cold cache was slow to answer or didn't answer at all. These
// pages draw the most logos, with next/image, plain <img> and SVG <image>.

const MAX_LOGO_BYTES = 40 * 1024;

type LogoLoad = { path: string; status: number; bytes: number };

function recordLogos(page: Page) {
  const logos: LogoLoad[] = [];
  const optimizer: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith("/_next/image")) optimizer.push(request.url());
  });
  page.on("response", async (response) => {
    const { pathname } = new URL(response.url());
    if (!/^\/images\/(team|conf)_logos\//.test(pathname)) return;
    const body = await response.body().catch(() => Buffer.alloc(0));
    logos.push({ path: pathname, status: response.status(), bytes: body.length });
  });
  return { logos, optimizer };
}

function expectSmallLogos({ logos, optimizer }: ReturnType<typeof recordLogos>) {
  expect(optimizer).toEqual([]);
  expect(logos.length).toBeGreaterThan(0);
  expect(logos.filter((logo) => logo.status !== 200 && logo.status !== 304)).toEqual([]);
  expect(logos.filter((logo) => logo.bytes > MAX_LOGO_BYTES)).toEqual([]);
}

for (const path of [
  "/basketball/team/Duke/",
  "/football/team/Alabama/",
  "/basketball/2025-26/conf-data/",
]) {
  test(`${path} loads small logos directly`, async ({ page }) => {
    const recorded = recordLogos(page);
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(3000);
    expectSmallLogos(recorded);
  });
}

// The compare pages' team picker shows every team's logo; picking a team
// draws its schedule with its own and every opponent's logo.
for (const [path, team] of [
  ["/basketball/compare/", "Duke"],
  ["/basketball/2025-26/compare/", null],
  ["/football/compare/", "Alabama"],
  ["/football/2025-26/compare/", null],
] as const) {
  test(`${path} loads small logos directly`, async ({ page }) => {
    const recorded = recordLogos(page);
    await page.goto(path);
    await expect(page.locator("button[title] img").first()).toBeVisible();
    if (team) {
      await page.locator(`button[title="${team}"]`).first().click();
      await expect(page.locator('img[src*="team_logos"]').nth(3)).toBeAttached();
    }
    await page.waitForTimeout(2000);
    expectSmallLogos(recorded);
  });
}

test("/basketball/game-preview/ loads small logos directly", async ({ page }) => {
  const recorded = recordLogos(page);
  await page.goto("/basketball/game-preview/?game=fixture-1");
  await expect(page.locator('img[src*="team_logos"]').nth(5)).toBeAttached();
  for (let y = 0; y < 4; y++) {
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);
  expectSmallLogos(recorded);
});

test("/basketball/whatif/ loads small logos directly", async ({ page }) => {
  const recorded = recordLogos(page);
  await page.goto("/basketball/whatif/");
  await expect(page.locator('img[src*="team_logos"]').nth(10)).toBeAttached();
  await page.waitForTimeout(2000);
  expectSmallLogos(recorded);
});

// A logo file must be at least as wide as it's drawn, in device pixels, or
// it looks soft. The team page shows the conference logo at a fixed height
// and its own width (ACC is 3.4:1).
async function sharpness(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((img: HTMLImageElement) => ({
      natural: img.complete ? img.naturalWidth : 0,
      needed: Math.ceil(img.getBoundingClientRect().width * window.devicePixelRatio),
    }))
    .catch(() => ({ natural: 0, needed: 0 }));
}

test("/basketball/team/Duke/ conference logo file is as wide as it is shown", async ({ page }) => {
  await page.goto("/basketball/team/Duke/");
  // The header swaps its phone and desktop layouts after hydration, so the
  // logo first found can be replaced or not yet laid out: measure until a
  // loaded logo has its final width.
  const selector = 'img[src*="conf_logos"]:visible';
  await expect.poll(async () => (await sharpness(page, selector)).needed).toBeGreaterThan(100);
  await expect.poll(async () => (await sharpness(page, selector)).natural).toBeGreaterThan(0);
  const { natural, needed } = await sharpness(page, selector);
  expect(natural).toBeGreaterThanOrEqual(needed);
});

// The custom scatterplot (/basketball/chart/) draws one logo per uploaded
// team, 20-100 px (default 44).
const CHART_CSV = [
  "Offense vs Defense,Offensive Rating,Defensive Rating",
  "Duke,121.4,92.8",
  "North Carolina,117.2,97.5",
  "Kansas,115.8,94.1",
].join("\n");

test("/basketball/chart/ draws uploaded teams' logos from small, sharp files", async ({ page }) => {
  const recorded = recordLogos(page);
  await page.goto("/basketball/chart/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "chart.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(CHART_CSV),
  });
  const logo = page.locator('img[alt="Duke"]').first();
  await expect(logo).toHaveJSProperty("complete", true);
  const { natural, needed } = await sharpness(page, 'img[alt="Duke"]');
  expect(natural).toBeGreaterThanOrEqual(needed);
  await page.waitForTimeout(1000);
  expectSmallLogos(recorded);
});
