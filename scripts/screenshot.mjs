#!/usr/bin/env node
// Full-page screenshots of routes at desktop and mobile widths, for checking
// visual changes (see the verify-visually skill).
//
// Usage (with a server running, e.g. `npm run build && npx next start`):
//   node scripts/screenshot.mjs /football/wins/ /basketball/standings/
//   node scripts/screenshot.mjs --base https://www.jthomanalytics.com --out .baseline/prod /football/wins/
//   node scripts/screenshot.mjs --scroll "[data-scroll-viewport]" /football/standings/
//
// --scroll <selector> also scrolls that element (e.g. a table's internal
// scroll viewport) and takes a second shot, to catch sticky-header bugs.

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
function take(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const [, value] = args.splice(index, 2);
  return value;
}

const base = take("base", "http://localhost:3000").replace(/\/$/, "");
const out = take("out", ".baseline/screens");
const scrollSelector = take("scroll", null);
const routes = args.length ? args : ["/football/wins/"];

const PREINSTALLED = "/opt/pw-browsers/chromium";
const browser = await chromium.launch({
  executablePath: existsSync(PREINSTALLED) ? PREINSTALLED : undefined,
});

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
};

mkdirSync(out, { recursive: true });
try {
  for (const route of routes) {
    for (const [label, viewport] of Object.entries(viewports)) {
      const page = await browser.newPage({ viewport, isMobile: viewport.isMobile });
      await page.goto(`${base}${route}`, { waitUntil: "load" });
      await page.waitForLoadState("networkidle").catch(() => {});
      const slug = route.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "home";
      const file = join(out, `${slug}.${label}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(file);
      if (scrollSelector) {
        const scrolled = await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (!el) return false;
          el.scrollTop = el.scrollHeight / 2;
          el.scrollLeft = el.scrollWidth / 2;
          return true;
        }, scrollSelector);
        if (scrolled) {
          const scrolledFile = join(out, `${slug}.${label}.scrolled.png`);
          await page.screenshot({ path: scrolledFile, fullPage: true });
          console.log(scrolledFile);
        }
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}
