#!/usr/bin/env node
// Report the gzipped first-load JS size of every App Router route, using the
// manifests from the last `next build`. Two columns:
//   pageKb   - the page's own chunk list; tracks Next's "First Load JS" column.
//   totalKb  - page plus every layout above it (header, providers, ...). This is
//              what a browser actually downloads on a cold visit, and is the
//              number budgets should use.
//
// Usage:
//   node scripts/route-sizes.mjs            # table to stdout
//   node scripts/route-sizes.mjs --json     # JSON to stdout (for budgets/CI)

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const NEXT_DIR = ".next";
const manifestPath = join(NEXT_DIR, "app-build-manifest.json");

// Gzipped JS per route from the last `next build`, sorted by route.
export function getRouteSizes() {
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing ${manifestPath}. Run \`npm run build\` first.`);
  }

  const { pages } = JSON.parse(readFileSync(manifestPath, "utf8"));
  const layouts = Object.keys(pages).filter((key) => key.endsWith("/layout"));

  const gzipCache = new Map();
  function gzipSize(file) {
    if (!gzipCache.has(file)) {
      const contents = readFileSync(join(NEXT_DIR, file));
      gzipCache.set(file, gzipSync(contents).length);
    }
    return gzipCache.get(file);
  }

  // A route loads its own page chunks plus every layout above it.
  function layoutsFor(pageKey) {
    const dir = pageKey.slice(0, -"/page".length) || "/";
    return layouts.filter((layoutKey) => {
      const layoutDir = layoutKey.slice(0, -"/layout".length);
      return layoutDir === "" || dir === layoutDir || dir.startsWith(`${layoutDir}/`);
    });
  }

  function sumKb(keys) {
    const files = new Set(
      keys.flatMap((key) => pages[key]).filter((file) => file.endsWith(".js")),
    );
    const bytes = [...files].reduce((sum, file) => sum + gzipSize(file), 0);
    return +(bytes / 1024).toFixed(1);
  }

  return Object.keys(pages)
    .filter((key) => key.endsWith("/page"))
    .map((pageKey) => ({
      route: pageKey.slice(0, -"/page".length) || "/",
      pageKb: sumKb([pageKey]),
      totalKb: sumKb([pageKey, ...layoutsFor(pageKey)]),
    }))
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
