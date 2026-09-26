#!/usr/bin/env node
// Report the gzipped first-load JS size of every App Router route, using the
// manifests from the last `next build` (Next 16 layout). Two columns:
//   pageKb   - JS specific to the route: its client components and those of
//              its layouts, excluding the shared framework runtime.
//   totalKb  - pageKb plus the shared runtime (build-manifest rootMainFiles).
//              This is what a browser downloads on a cold visit, and is the
//              number budgets use.
//
// Usage:
//   node scripts/route-sizes.mjs            # table to stdout
//   node scripts/route-sizes.mjs --json     # JSON to stdout (for budgets/CI)

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import { gzipSync } from "node:zlib";

const NEXT_DIR = ".next";
const APP_DIR = join(NEXT_DIR, "server", "app");
const MANIFEST_SUFFIX = "page_client-reference-manifest.js";

function findManifests(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return findManifests(full);
    return entry.name === MANIFEST_SUFFIX ? [full] : [];
  });
}

// Each manifest assigns globalThis.__RSC_MANIFEST[<route>/page] = {...}.
function loadManifest(file) {
  const sandbox = { globalThis: {} };
  sandbox.globalThis.self = sandbox.globalThis;
  runInNewContext(readFileSync(file, "utf8"), sandbox);
  const [[key, manifest]] = Object.entries(sandbox.globalThis.__RSC_MANIFEST);
  return { key, manifest };
}

// Gzipped JS per route from the last `next build`, sorted by route.
export function getRouteSizes() {
  const buildManifestPath = join(NEXT_DIR, "build-manifest.json");
  if (!existsSync(buildManifestPath) || !existsSync(APP_DIR)) {
    throw new Error("Missing build output. Run `npm run build` first.");
  }
  const { rootMainFiles } = JSON.parse(readFileSync(buildManifestPath, "utf8"));

  const gzipCache = new Map();
  function gzipSize(file) {
    if (!gzipCache.has(file)) {
      const contents = readFileSync(join(NEXT_DIR, decodeURIComponent(file)));
      gzipCache.set(file, gzipSync(contents).length);
    }
    return gzipCache.get(file);
  }
  const sumKb = (files) =>
    +([...files].reduce((sum, file) => sum + gzipSize(file), 0) / 1024).toFixed(1);

  const runtimeKb = sumKb(new Set(rootMainFiles));
  return findManifests(APP_DIR)
    .map(loadManifest)
    .filter(({ key }) => key.endsWith("/page") && !key.startsWith("/_"))
    .map(({ key, manifest }) => {
      const pageFiles = new Set();
      for (const mod of Object.values(manifest.clientModules)) {
        for (const chunk of mod.chunks ?? []) {
          if (typeof chunk === "string" && chunk.endsWith(".js") && !rootMainFiles.includes(chunk)) {
            pageFiles.add(chunk);
          }
        }
      }
      const pageKb = sumKb(pageFiles);
      return {
        route: key.slice(0, -"/page".length) || "/",
        pageKb,
        totalKb: +(pageKb + runtimeKb).toFixed(1),
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
}

const isCli = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isCli) {
  const routes = getRouteSizes();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(routes, null, 2));
  } else {
    const width = Math.max(...routes.map((r) => r.route.length));
    const col = (kb) => kb.toFixed(1).padStart(8);
    console.log(`${"route".padEnd(width)}  ${"pageKb".padStart(8)}  ${"totalKb".padStart(8)}`);
    for (const { route, pageKb, totalKb } of routes) {
      console.log(`${route.padEnd(width)}  ${col(pageKb)}  ${col(totalKb)}`);
    }
  }
}
