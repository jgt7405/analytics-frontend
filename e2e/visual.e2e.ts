import { expect, test, type Page, type Request, type TestInfo } from "@playwright/test";
import { access, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import sharp from "sharp";

// Screenshot comparison for behavior-preserving refactors (plan steps 7-8).
// Run with `npm run visual:compare` (scripts/visual-compare.mjs), never on
// its own: the reference shots are taken from a build of the base branch in
// the same run, against the same fixtures, so they match pixel for pixel.
//
// Routes: the pages that render the files steps 7-8 split or merge, with
// fixture data. Add a page here (and its fixtures) before changing a file it
// renders.
// `setup` runs after the page has settled, for views reached by clicking;
// give those routes a `name` so their shot doesn't clash with the plain page.
interface VisualRoute {
  path: string;
  name?: string;
  setup?: (page: Page) => Promise<void>;
}

const selectTeam = (team: string) => async (page: Page) => {
  await page.locator(`button[title="${team}"]`).first().click();
};

const VISUAL_ROUTES: VisualRoute[] = [
  // team-wins-breakdown, team-schedule-difficulty (basketball)
  { path: "/basketball/team/Duke/" },
  // team-schedule-difficulty (football)
  { path: "/football/team/Alabama/" },
  { path: "/basketball/standings/" },
  { path: "/football/standings/" },
  // standings history and first-place charts (fixtures dated in 2025-26, so
  // the archive page's axis doesn't move with today's date)
  { path: "/basketball/2025-26/standings/" },
  { path: "/football/2025-26/standings/" },
  // conference bids history charts (fixtures dated in 2025-26, as above)
  { path: "/basketball/2025-26/conf-data/" },
  { path: "/football/2025-26/conf-data/" },
  // team probability history charts: conference champion (both sports) and
  // championship game (football), fixtures dated in 2025-26 as above
  { path: "/basketball/2025-26/conf-tourney/" },
  { path: "/football/2025-26/conf-champ/" },
  // basketball compare-schedules (drawn once a team is picked)
  { path: "/basketball/compare/", name: "basketball-compare-Duke", setup: selectTeam("Duke") },
  // football compare-schedules
  { path: "/football/compare/", name: "football-compare-Alabama", setup: selectTeam("Alabama") },
  // BasketballWhatIfScenarios: the Big 12 baseline (fixture), before any pick
  { path: "/basketball/whatif/" },
  // FootballWhatIfContent: the Big 12 before any pick (fixture)
  { path: "/football/whatif/" },
  // game preview with a game picked (fixture: upcoming games, both teams' data)
  {
    path: "/basketball/game-preview/?game=fixture-1",
    name: "basketball-game-preview",
    setup: async (page) => {
      // The page sometimes drops `?game=` while the games load (a race
      // between its auto-select and URL-sync effects; see the plan's step 7
      // notes), leaving nothing picked. Pick the game in the picker then.
      const picker = page.locator("select", { has: page.locator('option[value="fixture-1"]') });
      if ((await picker.inputValue()) !== "fixture-1") await picker.selectOption("fixture-1");
    },
  },
  // nonconf-analysis, with the Atlantic Coast teams expanded
  {
    path: "/basketball/conf-data/",
    name: "basketball-conf-data-ACC",
    setup: async (page) => {
      // By the logo: phones hide the conference name.
      const row = page.locator("table").last().locator("tr", { has: page.locator('img[alt="Atlantic Coast"]') });
      await row.locator("td").first().click();
    },
  },
];

// Image exports (Download / Screenshot buttons), compared as files: the
// page shots can't see what a button saves. Desktop only: phones take the
// native share sheet instead of a download. `trigger` clicks through to the
// download. Not covered: the game preview PDF, the /basketball/chart/
// upload page, and NextGameImpact / WhatIfTeamSummary (they appear only
// after a what-if calculation, which has no fixture).
interface DownloadRoute extends VisualRoute {
  name: string;
  trigger: (page: Page) => Promise<void>;
}

const clickButton = (name: string, nth = 0) => async (page: Page) => {
  await page.getByRole("button", { name, exact: true }).nth(nth).click();
};
const clickScreenshot = (nth = 0) => async (page: Page) => {
  await page.locator('button[title="Download screenshot"]').nth(nth).click();
};

const DOWNLOAD_ROUTES: DownloadRoute[] = [
  // TableActionButtons: a table, and a history chart (third section)
  { path: "/football/standings/", name: "download-football-standings-table", trigger: clickButton("Download table as image") },
  { path: "/basketball/2025-26/standings/", name: "download-basketball-standings-history", trigger: clickButton("Download table as image", 2) },
  // compare pages (basketball: its own capture; football: `lib/export/compare-chart`)
  { path: "/basketball/compare/", name: "download-basketball-compare-Duke", setup: selectTeam("Duke"), trigger: clickButton("Download Chart") },
  { path: "/football/compare/", name: "download-football-compare-Alabama", setup: selectTeam("Alabama"), trigger: clickButton("Download Chart") },
  // basketball what-if tables (whatif/screenshot.ts)
  { path: "/basketball/whatif/", name: "download-basketball-whatif", trigger: clickScreenshot() },
  // team page: Download opens ScreenshotModal; take its first option
  {
    path: "/basketball/team/Duke/",
    name: "download-basketball-team-Duke",
    trigger: async (page) => {
      await clickButton("Download")(page);
      await page.getByText("Select Component to Screenshot").waitFor();
      await page.locator("div.space-y-2 > button").first().click();
    },
  },
];

const shotName = ({ path, name }: VisualRoute) =>
  `${name ?? path.split("/").filter(Boolean).join("-")}.png`;

// Timing makes screenshots flaky unless every page reaches its final state
// before the shot:
// - Endpoints without a fixture 404, and some hooks retry them (up to 3
//   times, 1-4 s apart), so a shot could show "Loading…" or the error state.
//   Here those endpoints answer at once with an empty 200 instead, so
//   nothing retries and both sides get the same answer.
// - Some sections mount (and fetch) only when scrolled into view, and
//   charts re-lay out when the viewport changes (see SHOT_HEIGHT).
// - Chart.js animates on the canvas.
// - Fonts use `font-display: optional` (see below).
const EMPTY = JSON.stringify({ data: [] });

// Logos go through Next's image optimizer (/_next/image), which in CI
// sometimes didn't answer within 30 s on one side, so a logo was missing
// from one shot. Here the test does the optimizer's job instead: the file
// from public/ of the build being shot (E2E_APP_DIR for the base branch),
// scaled down to the requested width with sharp (which Next itself uses).
// Scaling matters: some logos are 1,280-3,840 px wide, and Chrome sometimes
// hadn't painted such a large image, shown at 28 px, when the shot was taken.
const PUBLIC_DIR = resolve(process.env.E2E_APP_DIR ?? ".", "public");
const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
};

// Logos some charts load straight from public/ (`unoptimized` images, not
// /_next/image) are sent the same way, scaled to at most this width: a
// 1,000+ px original shown at 20-28 px was sometimes not yet painted in the
// shot (Mountain West on the basketball conf-data page, mobile). 128 px
// still covers a 28 px logo at the phone's 2.625 pixel ratio.
const DIRECT_IMAGE_WIDTH = 128;

async function serveImagesUnoptimized(page: Page) {
  await page.route("**/images/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const extension = extname(pathname).toLowerCase();
    const scalable = [".png", ".jpg", ".jpeg", ".webp"].includes(extension);
    if (!pathname.startsWith("/images/") || !scalable) return route.fallback();
    try {
      const file = await readFile(join(PUBLIC_DIR, decodeURIComponent(pathname)));
      const body = await sharp(file)
        .resize({ width: DIRECT_IMAGE_WIDTH, withoutEnlargement: true })
        .png()
        .toBuffer();
      await route.fulfill({ status: 200, contentType: "image/png", body });
    } catch {
      await route.fallback();
    }
  });
  await page.route("**/_next/image**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const source = params.get("url") ?? "";
    const width = Number(params.get("w"));
    const extension = extname(source).toLowerCase();
    const type = IMAGE_TYPES[extension];
    if (!source.startsWith("/") || !type) return route.continue();
    try {
      const file = await readFile(join(PUBLIC_DIR, source));
      // SVG and GIF go out as they are, as the optimizer does.
      const scalable = width > 0 && extension !== ".svg" && extension !== ".gif";
      const body = scalable
        ? await sharp(file).resize({ width, withoutEnlargement: true }).png().toBuffer()
        : file;
      await route.fulfill({ status: 200, contentType: scalable ? "image/png" : type, body });
    } catch {
      await route.continue();
    }
  });
}

// The site's font is `font-display: optional`: a render that doesn't have it
// within ~100 ms uses the fallback font for good. That still happened now
// and then despite the warm reload below (a whole shot in the fallback
// font), and html2canvas exports render a copy of the page in a new frame,
// which often missed it (text wrapped differently in the saved image). Here
// the CSS asks to wait for the font instead, so every render uses it.
async function waitForWebFonts(page: Page) {
  await page.route("**/_next/static/**/*.css", async (route) => {
    try {
      const response = await route.fetch();
      const css = (await response.text()).replace(
        /font-display:optional/g,
        "font-display:block",
      );
      await route.fulfill({ response, body: css });
    } catch {
      // The page navigated (reload) while this request was in flight.
    }
  });
}

async function answerMissingFixturesEmpty(page: Page) {
  await page.route("**/api/proxy/**", async (route) => {
    try {
      const response = await route.fetch();
      if (response.status() === 404) {
        await route.fulfill({ status: 200, contentType: "application/json", body: EMPTY });
      } else {
        await route.fulfill({ response });
      }
    } catch {
      // The page navigated (reload) while this request was in flight.
    }
  });
}

// A request still pending after this long is abandoned (the proxy's own
// backend timeouts are shorter), not something to wait for.
const ABANDONED_MS = 20_000;

/** Tracks /api/proxy requests of the current document. */
function trackDataRequests(page: Page) {
  const pending = new Map<Request, number>();
  let last = Date.now();
  const isData = (request: Request) => request.url().includes("/api/proxy/");
  page.on("request", (request) => {
    if (!isData(request)) return;
    pending.set(request, Date.now());
    last = Date.now();
  });
  const done = (request: Request) => {
    if (!pending.delete(request)) return;
    last = Date.now();
  };
  // A response counts as done: "requestfinished" only fires once the page
  // has read the body, which it may never do for an error response.
  page.on("response", (response) => done(response.request()));
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  // Requests of a document the page navigated away from never finish.
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) pending.clear();
  });
  const active = () => {
    const now = Date.now();
    for (const [request, started] of pending) {
      if (now - started > ABANDONED_MS) pending.delete(request);
    }
    return pending.size;
  };
  return {
    /** No data request pending, and none started for `quietMs`. */
    async idle(quietMs = 1_500, timeout = 60_000) {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (active() === 0 && Date.now() - last >= quietMs) return;
        await page.waitForTimeout(100);
      }
    },
  };
}

// Every page is shot in one tall viewport, set before it loads, instead of
// a full-page screenshot: that resizes the viewport mid-capture, which
// re-lays out responsive charts (Chart.js sometimes comes back blank) and
// mounts sections that load only when scrolled into view. With nothing
// ever resized, every section is in view from the first render. Taller
// than any page here (longest ~3,500 px on mobile); the rest is blank.
const SHOT_HEIGHT = 5_000;

test.describe.configure({ timeout: 180_000 });
// No service worker: the site's registers on the first load and takes over
// the reload, and a code chunk requested while it activates sometimes never
// arrived (a chart stuck on its loading skeleton in CI).
test.use({ serviceWorkers: "block" });

// Where a failed shot differs, logged to the job output: agent sessions
// can't always download the `visual-diff` artifact. Reads Playwright's diff
// image (differing pixels drawn in red) and names the elements at the
// centre of the changed area.
async function reportDifference(page: Page, testInfo: TestInfo, name: string) {
  const diffPath = testInfo.outputPath(name.replace(/\.png$/, "-diff.png"));
  if (!(await access(diffPath).then(() => true, () => false))) return;
  const { data, info } = await sharp(diffPath).raw().toBuffer({ resolveWithObject: true });
  let [left, top, right, bottom, count] = [Infinity, Infinity, -1, -1, 0];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i] > 200 && data[i + 1] < 80 && data[i + 2] < 80) {
        count++;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (count === 0) return;
  const elements = await page.evaluate(
    ([x, y]) =>
      document.elementsFromPoint(x, y).slice(0, 4).map((el) => {
        const label = el.getAttribute("alt") ?? el.getAttribute("aria-label") ?? el.textContent ?? "";
        return `<${el.tagName.toLowerCase()} class="${String(el.getAttribute("class") ?? "").slice(0, 60)}"> ${label.trim().slice(0, 60)}`;
      }),
    [(left + right) / 2, (top + bottom) / 2],
  );
  console.warn(
    `[visual] ${name}: ${count} red diff pixels in x ${left}-${right}, y ${top}-${bottom}; at its centre: ${elements.join(" | ")}`,
  );
}

// Loads the route and waits until it has reached its final state (data
// loaded, charts drawn, images decoded) before a shot or a download.
async function settlePage(page: Page, route: VisualRoute) {
  await page.setViewportSize({ width: page.viewportSize()!.width, height: SHOT_HEIGHT });
  await answerMissingFixturesEmpty(page);
  await serveImagesUnoptimized(page);
  await waitForWebFonts(page);
  // The site's fonts use `font-display: optional`: a font that isn't ready
  // within ~100 ms is skipped for that page load, which happens at random
  // under test load. Load the page once so fonts and logos are cached,
  // then reload and take the shot from the warm cache.
  await page.goto(route.path, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // A chart's code chunk occasionally never arrives in CI, leaving its
  // loading skeleton up; one more reload has always cleared it.
  for (let attempt = 1; ; attempt++) {
    const data = trackDataRequests(page);
    await page.reload({ waitUntil: "load" });
    await data.idle();
    if (route.setup) {
      await route.setup(page);
      await data.idle();
    }
    // Charts can mount late (their code loads on demand) and Chart.js
    // animates for 1 s, which "animations: disabled" doesn't stop (canvas).
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    // Loading skeletons (chart placeholders, table shimmers) use
    // animate-pulse; the page is done when none is left.
    const skeletons = page.locator(".animate-pulse");
    if (attempt === 2) {
      await expect(skeletons).toHaveCount(0, { timeout: 30_000 });
      break;
    }
    const cleared = await expect(skeletons)
      .toHaveCount(0, { timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    if (cleared) break;
  }
  // Every image loaded (or failed): a logo still in flight in the
  // reference shot showed up as a difference (Pac-12 on conf-data). Lazy
  // images the browser would defer (outside its load margin) are made
  // eager first, or they never finish.
  await page.evaluate(() => {
    for (const img of Array.from(document.images)) img.loading = "eager";
  });
  // An image that never finishes (seen once in CI on /football/whatif/,
  // not reproducible locally) no longer fails the test by itself: its
  // source is logged and the pixel comparison decides.
  await page
    .waitForFunction(() => Array.from(document.images).every((img) => img.complete), undefined, {
      timeout: 30_000,
    })
    .catch(async () => {
      const stuck = await page.evaluate(() =>
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => img.currentSrc || img.src),
      );
      console.warn(`[visual] ${route.path}: images still loading after 30 s: ${stuck.join(", ")}`);
    });
  // "complete" is also true for an image that ended without data (the
  // Big South logo once, locally): load those once more, then wait for
  // every image to be decoded so it is painted in the shot.
  const reloaded = await page.evaluate(async () => {
    const empty = Array.from(document.images).filter(
      (img) => img.complete && img.naturalWidth === 0 && (img.currentSrc || img.src),
    );
    for (const img of empty) {
      const { src, srcset } = img;
      img.removeAttribute("srcset");
      img.src = "";
      if (srcset) img.srcset = srcset;
      img.src = src;
    }
    await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {})));
    return empty.map((img) => img.currentSrc || img.src);
  });
  if (reloaded.length > 0) {
    console.warn(`[visual] ${route.path}: reloaded images that had no data: ${reloaded.join(", ")}`);
  }
  await page.waitForTimeout(1_500);
  // Pages are 20-30 px taller than SHOT_HEIGHT, so they can scroll, and a
  // shot now and then came out scrolled by 2 px (everything below the
  // sticky header shifted; ~77,000 differing pixels). Shoot from the top.
  const scrolled = await page.evaluate(async () => {
    const y = window.scrollY;
    window.scrollTo(0, 0);
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    return y;
  });
  if (scrolled !== 0) {
    console.warn(`[visual] ${route.path}: page was scrolled by ${scrolled} px; scrolled back to the top`);
  }
}

for (const route of VISUAL_ROUTES) {
  test(`${route.name ?? route.path} looks the same as on the base branch`, async ({ page }) => {
    await settlePage(page, route);
    await expect(page)
      .toHaveScreenshot(shotName(route), {
        animations: "disabled",
        caret: "hide",
        // Anti-aliasing noise in charts is a few pixels; a real change is
        // hundreds (a one-word label change: ~440).
        maxDiffPixels: 20,
        timeout: 90_000,
      })
      .catch(async (error: unknown) => {
        await reportDifference(page, test.info(), shotName(route)).catch(() => {});
        throw error;
      });
  });
}

// html2canvas comes from its CDN on every export path; serve the copy in
// node_modules instead, so both sides use the same code without the network.
const HTML2CANVAS = resolve("node_modules/html2canvas/dist/html2canvas.min.js");

for (const route of DOWNLOAD_ROUTES) {
  test(`${route.name} saves the same image as on the base branch`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "phones share instead of downloading");
    await page.route("https://html2canvas.hertzen.com/**", async (r) =>
      r.fulfill({ status: 200, contentType: "text/javascript", body: await readFile(HTML2CANVAS) }),
    );
    await settlePage(page, route);
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }),
      route.trigger(page),
    ]);
    const image = await readFile((await download.path())!);
    expect(image).toMatchSnapshot(`${route.name}.png`, { maxDiffPixels: 20 });
  });
}
