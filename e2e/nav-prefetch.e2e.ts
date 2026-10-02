import { expect, test } from "@playwright/test";

// The header's links don't prefetch (plan step 9). Every page is rendered per
// request and none has a loading.tsx, so a prefetch couldn't show anything
// sooner; it only cost a server request per link, about 43 per page view.
test("loading a page makes no router prefetch requests", async ({ page }) => {
  let prefetches = 0;
  page.on("request", (request) => {
    if (request.headers()["next-router-prefetch"] === "1") prefetches++;
  });
  await page.goto("/football/wins/");
  await expect(page.locator("table").first()).toBeVisible();
  await page.waitForTimeout(2000);
  expect(prefetches).toBe(0);
});

test("a header tab still navigates", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "tabs are in the menu on mobile");
  await page.goto("/football/wins/");
  await page
    .locator('nav[aria-label="Main navigation"] a[aria-label^="Standings "]')
    .click();
  await page.waitForURL("**/football/standings/**");
  await expect(page.locator("table").first()).toBeVisible();
});
