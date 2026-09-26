import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { FIXTURE_BACKEND_URL } from "./e2e/fixture-server";

// Browser smoke tests against a production build (`npm run build` first).
// The app talks to a fixture backend (e2e/fixture-server.ts, started in
// globalSetup) instead of the real one.
// Cloud agent sessions ship a Chromium at /opt/pw-browsers/chromium; use it
// when present so no browser download is needed. CI installs its own.
const PREINSTALLED_CHROMIUM = "/opt/pw-browsers/chromium";
const executablePath =
  !process.env.CI && existsSync(PREINSTALLED_CHROMIUM)
    ? PREINSTALLED_CHROMIUM
    : undefined;

const PORT = Number(process.env.E2E_PORT ?? 3200);

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: { executablePath },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: `npx next start -p ${PORT}`,
    env: { BACKEND_API_URL: FIXTURE_BACKEND_URL },
    url: `http://localhost:${PORT}/robots.txt`,
    // Always start a fresh server: a running one may point at another backend.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
