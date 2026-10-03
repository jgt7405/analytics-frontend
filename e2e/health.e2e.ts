import { expect, test } from "@playwright/test";

// /api/health/ is the uptime-monitor URL (with the trailing slash, as every
// route here: trailingSlash is on, so /api/health redirects to it).
test("/api/health/ answers ok and isn't cached", async ({ request }) => {
  const response = await request.get("/api/health/");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).status).toBe("ok");
});
