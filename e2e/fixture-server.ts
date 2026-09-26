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

export function startFixtureServer(): Promise<Server> {
  const handlers = backendHandlers(FIXTURE_BACKEND_URL);
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${FIXTURE_PORT}`);
    if (url.pathname === "/__log") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(requestLog));
      return;
    }
    const response =
      (await getResponse(handlers, new Request(url, { method: req.method }))) ??
      new Response(JSON.stringify({ error: "No fixture" }), { status: 404 });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  return new Promise((resolve) => server.listen(FIXTURE_PORT, () => resolve(server)));
}
