import { expect, test } from "@playwright/test";

// Security headers come from next.config.ts headers(), not <meta> tags
// (browsers ignore http-equiv for these). X-XSS-Protection is deprecated and
// no longer sent. The viewport and theme-color tags come from the root
// layout's `viewport` export, so each appears once (plan step 10).
test("pages send the security headers and one viewport tag", async ({ page }) => {
  const response = await page.goto("/football/standings/");
  const headers = response!.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("origin-when-cross-origin");
  expect(headers["x-xss-protection"]).toBeUndefined();

  await expect(page.locator('meta[name="viewport"]')).toHaveCount(1);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    "width=device-width, initial-scale=1, viewport-fit=cover",
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
  await expect(page.locator("meta[http-equiv]")).toHaveCount(0);
});
