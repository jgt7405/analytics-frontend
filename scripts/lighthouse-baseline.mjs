#!/usr/bin/env node
// Lighthouse baseline for a small, representative route matrix.
//
// For each route it runs Lighthouse (mobile preset) several times and keeps the
// median run, recording category scores, lab Core Web Vitals, JS transfer size
// and how many /api/proxy requests the page made.
//
// Usage:
//   npm run baseline:lighthouse                                # production site
//   npm run baseline:lighthouse -- --base http://localhost:3000
//   npm run baseline:lighthouse -- --runs 5 --out .baseline/lighthouse.json
//
// CI gates (optional): exit non-zero when a route's accessibility score is
// below --min-accessibility, and print a GitHub warning when performance is
// below --warn-performance (lab performance is too noisy to gate on).
//   npm run baseline:lighthouse -- --min-accessibility 90 --warn-performance 80
//
// Measure against a production build with a reachable backend. A local server
// that cannot reach the backend only measures error states.
//
// Chrome: uses CHROME_PATH if set, otherwise a locally installed Chrome, or the
// Playwright Chromium at /opt/pw-browsers/chromium in cloud sessions.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const ROUTES = [
  "/football/wins/",
  "/football/standings/",
  "/football/team/Alabama/",
  "/football/2025-26/wins/",
  "/basketball/standings/",
  "/basketball/compare/",
  "/basketball/game-preview/",
];

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const base = arg("base", "https://www.jthomanalytics.com").replace(/\/$/, "");
const runs = Number(arg("runs", "3"));
const out = arg("out", ".baseline/lighthouse.json");
const minAccessibility = Number(arg("min-accessibility", "0"));
const warnPerformance = Number(arg("warn-performance", "0"));

const PLAYWRIGHT_CHROMIUM = "/opt/pw-browsers/chromium";
if (!process.env.CHROME_PATH && existsSync(PLAYWRIGHT_CHROMIUM)) {
  process.env.CHROME_PATH = PLAYWRIGHT_CHROMIUM;
}

function summarize(lhr) {
  const audit = (id) => lhr.audits[id]?.numericValue;
  const requests = lhr.audits["network-requests"]?.details?.items ?? [];
  const jsBytes = requests
    .filter((r) => r.resourceType === "Script")
    .reduce((sum, r) => sum + (r.transferSize ?? 0), 0);
  const score = (id) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
  return {
    performance: score("performance"),
    accessibility: score("accessibility"),
    bestPractices: score("best-practices"),
    seo: score("seo"),
    lcpMs: Math.round(audit("largest-contentful-paint") ?? 0),
    fcpMs: Math.round(audit("first-contentful-paint") ?? 0),
    tbtMs: Math.round(audit("total-blocking-time") ?? 0),
    cls: +(audit("cumulative-layout-shift") ?? 0).toFixed(3),
    jsTransferKb: +(jsBytes / 1024).toFixed(1),
    proxyRequests: requests.filter((r) => r.url.includes("/api/proxy/")).length,
    totalRequests: requests.length,
  };
}

function median(results) {
  const sorted = [...results].sort((a, b) => a.performance - b.performance);
  return sorted[Math.floor(sorted.length / 2)];
}

const chrome = await chromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
});

const report = { base, runs, recordedAt: new Date().toISOString(), routes: {} };
const failures = [];
try {
  for (const route of ROUTES) {
    const results = [];
    for (let i = 0; i < runs; i++) {
      const result = await lighthouse(`${base}${route}`, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      });
      if (result.lhr.runtimeError) {
        console.error(`${route}: ${result.lhr.runtimeError.message}`);
        continue;
      }
      results.push(summarize(result.lhr));
    }
    if (results.length === 0) {
      failures.push(`${route}: Lighthouse could not load the page`);
      continue;
    }
    report.routes[route] = median(results);
    const m = report.routes[route];
    console.log(
      `${route.padEnd(28)} perf ${m.performance}  a11y ${m.accessibility}  LCP ${m.lcpMs}ms  TBT ${m.tbtMs}ms  CLS ${m.cls}  JS ${m.jsTransferKb}kB  proxy ${m.proxyRequests}`,
    );
    if (m.accessibility < minAccessibility) {
      failures.push(`${route}: accessibility ${m.accessibility} < ${minAccessibility}`);
    }
    if (m.performance < warnPerformance) {
      console.log(`::warning::${route}: Lighthouse performance ${m.performance} < ${warnPerformance}`);
    }
  }
} finally {
  await chrome.kill();
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nWrote ${out}`);

if (minAccessibility && failures.length) {
  console.error(`\nLighthouse gate failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
