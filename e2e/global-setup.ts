import { rmSync } from "node:fs";
import { join } from "node:path";
import {
  SLOW_BACKEND_DELAY_MS,
  SLOW_FIXTURE_PORT,
  startFixtureServer,
} from "./fixture-server";

// Runs in Playwright's main process for the whole test run.
export default async function globalSetup() {
  // Start from an empty server-fetch cache, as CI does: responses cached by
  // an earlier run would answer server fetches without the backend (and,
  // for e2e/nav-speed.e2e.ts, without its delay).
  rmSync(join(process.env.E2E_APP_DIR ?? process.cwd(), ".next/cache/fetch-cache"), {
    recursive: true,
    force: true,
  });
  const servers = await Promise.all([
    startFixtureServer(),
    startFixtureServer(SLOW_FIXTURE_PORT, SLOW_BACKEND_DELAY_MS),
  ]);
  return () =>
    Promise.all(
      servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
    );
}
