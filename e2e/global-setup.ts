import { startFixtureServer } from "./fixture-server";

// Runs in Playwright's main process for the whole test run.
export default async function globalSetup() {
  const server = await startFixtureServer();
  return () => new Promise<void>((resolve) => server.close(() => resolve()));
}
