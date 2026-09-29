import { expect, test, type Page, type Request } from "@playwright/test";

// Screenshot comparison for behavior-preserving refactors (plan step 7).
// Run with `npm run visual:compare` (scripts/visual-compare.mjs), never on
// its own: the reference shots are taken from a build of the base branch in
// the same run, against the same fixtures, so they match pixel for pixel.
//
// Routes: the pages that render the files step 7 splits, with fixture data.
// Add a page here (and its fixtures) before splitting a file it renders.
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
  // basketball compare-schedules (drawn once a team is picked)
  { path: "/basketball/compare/", name: "basketball-compare-Duke", setup: selectTeam("Duke") },
  // football compare-schedules
  { path: "/football/compare/", name: "football-compare-Alabama", setup: selectTeam("Alabama") },
  // BasketballWhatIfScenarios: the Big 12 baseline (fixture), before any pick
  { path: "/basketball/whatif/" },
  // FootballWhatIfContent: the Big 12 before any pick (fixture)
  { path: "/football/whatif/" },
  // game preview with a game picked (fixture: upcoming games, both teams' data)
  { path: "/basketball/game-preview/?game=fixture-1", name: "basketball-game-preview" },
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

for (const route of VISUAL_ROUTES) {
  test(`${route.name ?? route.path} looks the same as on the base branch`, async ({ page }) => {
    await page.setViewportSize({ width: page.viewportSize()!.width, height: SHOT_HEIGHT });
    await answerMissingFixturesEmpty(page);
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
    await page.waitForTimeout(1_500);
    await expect(page).toHaveScreenshot(shotName(route), {
      animations: "disabled",
      caret: "hide",
      // Anti-aliasing noise in charts is a few pixels; a real change is
      // hundreds (a one-word label change: ~440).
      maxDiffPixels: 20,
      timeout: 90_000,
    });
  });
}
