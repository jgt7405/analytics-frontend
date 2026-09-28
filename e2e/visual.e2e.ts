import { expect, test, type Page, type Request } from "@playwright/test";

// Screenshot comparison for behavior-preserving refactors (plan step 7).
// Run with `npm run visual:compare` (scripts/visual-compare.mjs), never on
// its own: the reference shots are taken from a build of the base branch in
// the same run, against the same fixtures, so they match pixel for pixel.
//
// Routes: the pages that render the files step 7 splits, with fixture data.
// Add a page here (and its fixtures) before splitting a file it renders.
const VISUAL_ROUTES = [
  // BasketballTeamWinsBreakdown, BasketballTeamScheduleDifficulty
  "/basketball/team/Duke/",
  // FootballTeamScheduleDifficulty
  "/football/team/Alabama/",
  "/basketball/standings/",
  "/football/standings/",
];

const shotName = (route: string) => `${route.split("/").filter(Boolean).join("-")}.png`;

// Timing makes screenshots flaky unless every page reaches its final state
// before the shot:
// - Endpoints without a fixture 404, and some hooks retry them (up to 3
//   times, 1-4 s apart), so a shot could show "Loading…" or the error state.
//   Here those endpoints answer at once with an empty 200 instead, so
//   nothing retries and both sides get the same answer.
// - Some sections mount (and fetch) only when scrolled into view, and
//   charts re-lay out when the viewport changes (see fitViewportToPage).
// - Fonts use `font-display: optional` (see below).
const EMPTY = JSON.stringify({ data: [] });

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

/**
 * Make the viewport as tall as the page before the shot. Otherwise the
 * full-page screenshot resizes it mid-capture, which re-lays out responsive
 * charts and mounts sections that load only when scrolled into view. Here
 * that happens first, and their data settles, until the height is stable.
 */
async function fitViewportToPage(page: Page, data: ReturnType<typeof trackDataRequests>) {
  const width = page.viewportSize()!.width;
  let height = page.viewportSize()!.height;
  for (let i = 0; i < 10; i++) {
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    if (pageHeight === height) return;
    height = pageHeight;
    await page.setViewportSize({ width, height });
    await data.idle();
  }
}

test.describe.configure({ timeout: 120_000 });

for (const route of VISUAL_ROUTES) {
  test(`${route} looks the same as on the base branch`, async ({ page }) => {
    await answerMissingFixturesEmpty(page);
    // The site's fonts use `font-display: optional`: a font that isn't ready
    // within ~100 ms is skipped for that page load, which happens at random
    // under test load. Load the page once so fonts and logos are cached,
    // then reload and take the shot from the warm cache.
    await page.goto(route, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const data = trackDataRequests(page);
    await page.reload({ waitUntil: "load" });
    await data.idle();
    await fitViewportToPage(page, data);
    await expect(page).toHaveScreenshot(shotName(route), {
      fullPage: true,
      animations: "disabled",
      caret: "hide",
      // Anti-aliasing noise in charts is a few pixels; a real change is
      // hundreds (a one-word label change: ~440).
      maxDiffPixels: 20,
      timeout: 90_000,
    });
  });
}
