import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// Accessibility regression checks (plan step 10, item 3): an axe scan for
// WCAG 2.0/2.1 A and AA problems, plus keyboard and focus checks for the
// navigation, selectors, tables and charts. Each check covers only pages
// and components that passed when it was added; the ones that didn't are
// listed in docs/ARCHITECTURE_PLAN.md (step 10) and join a check when
// they're fixed. Runs against the fixture backend like the smoke tests.

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// Pages with no axe violation, desktop and mobile. Not here yet (failing):
// both team pages, conf-data (current and archive, both sports), both
// what-if pages and the game preview.
const AXE_ROUTES = [
  "/basketball/standings/",
  "/football/standings/",
  "/basketball/wins/",
  "/football/wins/",
  "/football/2025-26/wins/",
  "/basketball/2025-26/standings/",
  "/football/2025-26/standings/",
  "/basketball/2025-26/conf-tourney/",
  "/football/2025-26/conf-champ/",
  "/basketball/compare/",
  "/football/compare/",
];

// Like the screenshot checks, load each page in one tall viewport so every
// section (some mount only when scrolled into view) is rendered and scanned.
const TALL_VIEWPORT_HEIGHT = 5_000;

/** Waits until no /api/proxy request is pending and none started for `quietMs`. */
async function waitForData(page: Page, load: () => Promise<unknown>, quietMs = 1_500) {
  let pending = 0;
  let last = Date.now();
  const isData = (url: string) => url.includes("/api/proxy/");
  page.on("request", (request) => {
    if (!isData(request.url())) return;
    pending++;
    last = Date.now();
  });
  const done = (url: string) => {
    if (!isData(url)) return;
    pending = Math.max(0, pending - 1);
    last = Date.now();
  };
  page.on("response", (response) => done(response.url()));
  page.on("requestfailed", (request) => done(request.url()));
  await load();
  await expect
    .poll(() => pending === 0 && Date.now() - last >= quietMs, { timeout: 30_000 })
    .toBe(true);
}

async function openTall(page: Page, path: string) {
  const { width } = page.viewportSize()!;
  await page.setViewportSize({ width, height: TALL_VIEWPORT_HEIGHT });
  await waitForData(page, () => page.goto(path, { waitUntil: "load" }));
  await expect(page.locator("#main-content")).toBeVisible();
}

test.describe("axe", () => {
  test.describe.configure({ timeout: 90_000 });

  for (const path of AXE_ROUTES) {
    test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
      await openTall(page, path);
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      const summary = violations.map(
        (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join(", ")}`,
      );
      expect(summary).toEqual([]);
    });
  }
});

/** True once the focused element shows an outline or a focus ring. */
async function hasVisibleFocus(locator: Locator) {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
    return outline || style.boxShadow !== "none";
  });
}

/** Presses Tab until `target` has focus; fails after `max` presses. */
async function tabTo(page: Page, target: Locator, max = 40) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`Tab never reached ${target}`);
}

test.describe("keyboard and focus", () => {
  test("header tabs are reached with Tab in order and show a focus outline", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "tabs are in the menu on mobile");
    await page.goto("/football/standings/");
    const tabs = page.locator('nav[aria-label="Main navigation"] a');
    await expect(tabs.first()).toBeVisible();
    const count = await tabs.count();
    expect(count).toBeGreaterThan(10);

    await tabTo(page, tabs.first());
    for (let i = 0; i < count; i++) {
      const tab = tabs.nth(i);
      await expect(tab).toBeFocused();
      // The outline transitions in, so poll.
      await expect.poll(() => hasVisibleFocus(tab)).toBe(true);
      if (i < count - 1) await page.keyboard.press("Tab");
    }

    // Enter on a focused tab navigates.
    await tabs.first().focus();
    const wins = page.locator('nav[aria-label="Main navigation"] a[aria-label^="Wins "]');
    await wins.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL("**/football/wins/**");
    await expect(page.locator("table").first()).toBeVisible();
  });

  test("the mobile menu opens, traps focus and closes with the keyboard", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "the menu exists only on mobile");
    await page.goto("/football/standings/");
    const toggle = page.getByRole("button", { name: "Toggle navigation menu" });
    await tabTo(page, toggle);
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    const first = page.locator("#mobile-menu a").first();
    // The focus trap ends at Contact (the sport switch after it isn't
    // reached with Tab yet).
    const contact = page.locator("#mobile-menu").getByRole("menuitem", { name: "Contact" });
    await expect(first).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(contact).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(first).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });

  test("the conference selector is reached with Tab and has a name", async ({ page }) => {
    await page.goto("/football/wins/");
    const select = page.getByRole("combobox", { name: "Select conference" });
    await expect(select).toBeVisible();
    await tabTo(page, select);
    // Not checked yet: a visible focus indicator (globals.css removes it).
  });

  for (const [path, team] of [
    ["/basketball/compare/", "Duke"],
    ["/football/compare/", "Alabama"],
  ]) {
    test(`${path} search picks a team with the keyboard`, async ({ page }) => {
      await page.goto(path);
      const search = page.getByPlaceholder("Search teams...");
      await tabTo(page, search);
      await page.keyboard.type(team.slice(0, 4));
      // Tab moves from the box to the first result; Enter picks it. Not
      // checked yet: arrow keys and a visible focus on the results.
      const result = search.locator("..").getByRole("button", { name: team });
      await tabTo(page, result, 3);
      await page.keyboard.press("Enter");
      await expect(search).toHaveValue("");
      await expect(page.getByText("Select teams above or use search")).toBeHidden();
    });
  }

  test("a team link in the standings table opens with Enter", async ({ page }) => {
    await page.goto("/football/standings/");
    const view = page.getByRole("button", { name: "View Alabama" }).first();
    await tabTo(page, view);
    await expect.poll(() => hasVisibleFocus(view)).toBe(true);
    await page.keyboard.press("Enter");
    await page.waitForURL("**/football/team/Alabama/**");
  });

  for (const path of ["/basketball/standings/", "/football/standings/", "/basketball/wins/", "/football/wins/"]) {
    test(`${path} tables have column headers`, async ({ page }) => {
      await openTall(page, path);
      const tables = page.locator("table");
      expect(await tables.count()).toBeGreaterThan(0);
      for (const table of await tables.all()) {
        await expect(table.locator("thead th").first()).toBeAttached();
      }
    });
  }

  // Charts need a text alternative: a canvas is announced as an image with
  // a description of what it shows.
  for (const path of ["/basketball/standings/", "/football/standings/"]) {
    test(`${path} charts have a text alternative`, async ({ page }) => {
      await openTall(page, path);
      const canvases = page.locator("canvas");
      expect(await canvases.count()).toBeGreaterThan(0);
      for (const canvas of await canvases.all()) {
        await expect(canvas).toHaveAttribute("role", "img");
        await expect(canvas).toHaveAttribute("aria-label", /\S{10,}/);
      }
    });
  }
  // Dialogs: opened from the keyboard, focus moves in and stays in, Escape
  // closes, and focus returns to the button that opened them.
  const dialogs = [
    {
      name: "the contact dialog",
      path: "/football/standings/",
      opener: (page: Page) => page.locator("footer").getByRole("button", { name: "Contact" }),
      title: "Contact",
    },
    {
      name: "the team page download dialog",
      path: "/basketball/team/Duke/",
      opener: (page: Page) => page.getByRole("button", { name: "Download", exact: true }).first(),
      title: "Select Component to Screenshot",
    },
  ];
  for (const { name, path, opener, title } of dialogs) {
    test(`${name} works from the keyboard`, async ({ page }) => {
      // Let the page settle first: the team page swaps to its mobile layout
      // after loading, which re-creates the button.
      await waitForData(page, () => page.goto(path));
      const button = opener(page);
      await expect(button).toBeVisible();
      await button.focus();
      await page.keyboard.press("Enter");

      const dialog = page.getByRole("dialog", { name: title });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute("aria-modal", "true");
      await expect(dialog).toBeFocused();
      await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();

      // Tab cycles through the dialog's controls without leaving it.
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      }

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(button).toBeFocused();
    });
  }

  test("the contact dialog keeps a half-typed message after closing", async ({ page }) => {
    // It loads on first open (out of every page's first load) and then
    // stays mounted.
    await page.goto("/football/standings/");
    const open = page.locator("footer").getByRole("button", { name: "Contact" });
    const dialog = page.getByRole("dialog", { name: "Contact" });
    await open.click();
    await dialog.getByPlaceholder("Your name").fill("Pat");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await open.click();
    await expect(dialog.getByPlaceholder("Your name")).toHaveValue("Pat");
  });
});
