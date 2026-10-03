import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { CONTENT_SECURITY_POLICY } from "../src/config/csp";

// The Content-Security-Policy (src/config/csp.ts, report-only for now) must
// allow everything these pages load: a new outside source fails here until
// the policy lists it. Report-only still fires securitypolicyviolation in
// the page, which is what's collected.
const ROUTES = [
  "/football/standings/",
  "/basketball/standings/",
  "/football/wins/",
  "/basketball/wins/",
  "/football/2025-26/wins/",
  "/basketball/team/Duke/",
  "/football/team/Alabama/",
  "/basketball/compare/",
  "/football/compare/",
  "/basketball/whatif/",
  "/football/whatif/",
  "/basketball/game-preview/?game=fixture-1",
  "/basketball/2025-26/conf-data/",
];

async function collectViolations(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __cspViolations: string[] }).__cspViolations = seen;
    document.addEventListener("securitypolicyviolation", (e) => {
      seen.push(`${e.effectiveDirective} ${e.blockedURI}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations);
}

test("pages send the report-only policy and its reporting endpoint", async ({ page }) => {
  const response = await page.goto("/football/standings/");
  const headers = response!.headers();
  expect(headers["content-security-policy-report-only"]).toBe(CONTENT_SECURITY_POLICY);
  expect(headers["reporting-endpoints"]).toBe('csp="/api/csp-report/"');
  expect(headers["content-security-policy"]).toBeUndefined();
});

for (const path of ROUTES) {
  test(`${path} loads nothing the policy would block`, async ({ page }) => {
    const violations = await collectViolations(page);
    await page.goto(path, { waitUntil: "load" });
    await expect(page.locator("#main-content")).toBeVisible();
    await page.waitForTimeout(2_000);
    expect(await violations()).toEqual([]);
  });
}

test("an image export (html2canvas from its CDN) breaks no rule", async ({ page }) => {
  // Serve the CDN file from node_modules (CI has no guaranteed outside
  // network); the policy still sees the CDN URL.
  const html2canvas = await readFile(resolve("node_modules/html2canvas/dist/html2canvas.min.js"));
  await page.route("https://html2canvas.hertzen.com/**", (route) =>
    route.fulfill({ body: html2canvas, contentType: "application/javascript" }),
  );
  const violations = await collectViolations(page);
  await page.goto("/football/standings/");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download table as image" }).first().click();
  await download;
  expect(await violations()).toEqual([]);
});

test("/api/csp-report/ accepts a report", async ({ request }) => {
  const response = await request.post("/api/csp-report/", {
    headers: { "content-type": "application/csp-report" },
    data: JSON.stringify({
      "csp-report": { "effective-directive": "script-src-elem", "blocked-uri": "inline" },
    }),
  });
  expect(response.status()).toBe(204);
});
