// The backend the Playwright server talks to: the curated fixtures in
// fixtures/backend, answered by the same MSW handlers the unit tests use.
// playwright.config.ts points the app's BACKEND_API_URL here; endpoints
// without a fixture answer 404, so pages also show their error states.
//
// GET /__log returns the backend URLs requested so far (tests check, e.g.,
// that an archive page asked for ?season=).

import { createServer, type Server } from "node:http";
import { getResponse } from "msw";
import { backendHandlers, requestLog } from "../fixtures/backend";

export const FIXTURE_PORT = Number(process.env.E2E_FIXTURE_PORT ?? 3299);
export const FIXTURE_BACKEND_URL = `http://localhost:${FIXTURE_PORT}/api`;

// The same fixtures, each answered after SLOW_BACKEND_DELAY_MS: the backend
// on a bad day (Railway restarting or stalled). A second app server talks to
// it (playwright.config.ts) so e2e/nav-speed.e2e.ts can check what a visitor
// sees meanwhile without slowing every other test.
export const SLOW_FIXTURE_PORT = Number(process.env.E2E_SLOW_FIXTURE_PORT ?? 3298);
export const SLOW_FIXTURE_BACKEND_URL = `http://localhost:${SLOW_FIXTURE_PORT}/api`;
export const SLOW_BACKEND_DELAY_MS = 8000;
export const SLOW_APP_PORT = Number(process.env.E2E_SLOW_PORT ?? 3201);

export function startFixtureServer(
  port = FIXTURE_PORT,
  delayMs = 0,
): Promise<Server> {
  const handlers = backendHandlers(`http://localhost:${port}/api`);
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    if (url.pathname === "/__log") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(requestLog));
      return;
    }
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const response =
      (await getResponse(handlers, new Request(url, { method: req.method }))) ??
      new Response(JSON.stringify({ error: "No fixture" }), { status: 404 });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
