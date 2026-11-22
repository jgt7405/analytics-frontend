#!/usr/bin/env node
// Is the production site up? Run every 15 minutes by
// .github/workflows/site-monitor.yml; a failed run emails the repo owner.
//
// Checks, the way a visitor's browser reaches them:
//   pages     the HTML of key pages answers 200
//   data      key backend data through /api/proxy answers 200 with content
//   what-if   one football what-if calculation through the proxy succeeds
//
// A check that fails is retried once (a backend restart takes seconds), so a
// single blip doesn't email anyone.
//
// Usage: node scripts/site-monitor.mjs [--base https://www.jthomanalytics.com]

const args = process.argv.slice(2);
const baseIndex = args.indexOf("--base");
const BASE = (baseIndex >= 0 ? args[baseIndex + 1] : "https://www.jthomanalytics.com").replace(/\/+$/, "");

const PAGES = [
  "/football/home/",
  "/basketball/home/",
  "/football/wins/",
  "/football/standings/",
  "/football/cfp/",
  "/football/whatif/",
  "/basketball/wins/",
  "/basketball/standings/",
  "/basketball/whatif/",
];

const DATA = [
  "/api/proxy/football/standings/SEC/",
  "/api/proxy/cfp/All_Teams/",
  "/api/proxy/standings/Big_12/",
  "/api/proxy/ncaa_tourney/All_Teams/",
];

const WHATIF = {
  path: "/api/proxy/football/whatif/",
  body: { conference: "Big Ten", selections: [] },
};

const TIMEOUT_MS = { page: 30_000, data: 30_000, whatif: 115_000 };
const RETRY_DELAY_MS = 20_000;

/** True when a decoded body has something in it. */
function hasContent(body) {
  if (Array.isArray(body)) return body.length > 0;
  if (!body || typeof body !== "object") return false;
  if (Array.isArray(body.data)) return body.data.length > 0;
  return Object.keys(body).length > 0 && !("error" in body);
}

async function checkOnce(kind, path) {
  const url = `${BASE}${path}`;
  const started = Date.now();
  const init = kind === "whatif"
    ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(WHATIF.body) }
    : {};
  const response = await fetch(url, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS[kind]),
    headers: { ...init.headers, "user-agent": "jthom-site-monitor" },
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (response.status !== 200) {
    const text = (await response.text()).slice(0, 200);
    throw new Error(`${response.status} after ${seconds}s ${text}`);
  }
  if (kind === "page") return seconds;
  const body = await response.json();
  if (kind === "whatif" ? body?.success !== true : !hasContent(body)) {
    throw new Error(`200 after ${seconds}s but the response was empty or an error`);
  }
  return seconds;
}

async function check(kind, path) {
  try {
    return { kind, path, ok: true, detail: await checkOnce(kind, path) };
  } catch (first) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    try {
      return { kind, path, ok: true, detail: `${await checkOnce(kind, path)} (on retry; first try: ${first.message})` };
    } catch (second) {
      return { kind, path, ok: false, detail: second.message };
    }
  }
}

const results = await Promise.all([
  ...PAGES.map((path) => check("page", path)),
  ...DATA.map((path) => check("data", path)),
  check("whatif", WHATIF.path),
]);

for (const r of results) {
  console.log(`${r.ok ? "ok  " : "FAIL"} ${r.kind.padEnd(6)} ${r.path}  ${r.detail}${r.ok ? "s" : ""}`);
}
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.log(`\n${failed.length} check(s) failed on ${BASE}`);
  process.exitCode = 1;
}
