#!/usr/bin/env node
// Reliability probe for the production /api/proxy route.
//
// Calls a representative set of proxy endpoints several times each and records
// status codes, failures, response times and Vercel CDN cache results. It is a
// synthetic check: real-traffic error rates live in the Vercel logs.
//
// Paths are requested exactly as the site's client code does (no trailing
// slash), so the timings include the 308 trailing-slash redirect that
// `trailingSlash: true` adds to every browser proxy call.
//
// Usage:
//   npm run baseline:proxy
//   npm run baseline:proxy -- --base http://localhost:3000 --rounds 10 --out .baseline/proxy.json

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const ENDPOINTS = [
  "/football_teams",
  "/football_conf_data",
  "/football/standings/SEC",
  "/football/cwv/Big_Ten",
  "/football/twv/Big_12",
  "/football/conf_champ/ACC",
  "/football_seed/SEC",
  "/cfp/All_Teams",
  "/basketball_teams",
  "/unified_conference_data",
  "/standings/Big_12",
  "/cwv/SEC",
  "/seed/Big_Ten",
  "/ncaa_tourney/All_Teams",
];

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const base = arg("base", "https://www.jthomanalytics.com").replace(/\/$/, "");
const rounds = Number(arg("rounds", "5"));
const out = arg("out", ".baseline/proxy-probe.json");
const TIMEOUT_MS = 35000;

async function probe(path) {
  const started = performance.now();
  try {
    const res = await fetch(`${base}/api/proxy${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await res.arrayBuffer();
    return {
      status: res.status,
      ms: Math.round(performance.now() - started),
      cache: res.headers.get("x-vercel-cache") ?? "n/a",
      redirected: res.redirected,
    };
  } catch (error) {
    const timedOut = error?.name === "TimeoutError";
    return {
      status: timedOut ? "timeout" : "network-error",
      ms: Math.round(performance.now() - started),
      cache: "n/a",
      redirected: false,
    };
  }
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const samples = Object.fromEntries(ENDPOINTS.map((e) => [e, []]));
for (let round = 0; round < rounds; round++) {
  for (const endpoint of ENDPOINTS) {
    samples[endpoint].push(await probe(endpoint));
  }
}

const report = { base, rounds, recordedAt: new Date().toISOString(), endpoints: {} };
for (const [endpoint, results] of Object.entries(samples)) {
  const times = results.map((r) => r.ms);
  const failures = results.filter((r) => typeof r.status !== "number" || r.status >= 400);
  const cache = {};
  for (const r of results) cache[r.cache] = (cache[r.cache] ?? 0) + 1;
  report.endpoints[endpoint] = {
    ok: results.length - failures.length,
    failed: failures.length,
    failureStatuses: failures.map((r) => r.status),
    firstMs: times[0],
    medianMs: percentile(times, 50),
    maxMs: Math.max(...times),
    cache,
    redirected: results.filter((r) => r.redirected).length,
  };
}

const all = Object.values(report.endpoints);
report.summary = {
  requests: ENDPOINTS.length * rounds,
  failed: all.reduce((sum, e) => sum + e.failed, 0),
  medianOfMediansMs: percentile(all.map((e) => e.medianMs), 50),
  slowestFirstMs: Math.max(...all.map((e) => e.firstMs)),
  redirected: all.reduce((sum, e) => sum + e.redirected, 0),
};

const width = Math.max(...ENDPOINTS.map((e) => e.length));
for (const [endpoint, e] of Object.entries(report.endpoints)) {
  const cache = Object.entries(e.cache).map(([k, v]) => `${k}:${v}`).join(" ");
  console.log(
    `${endpoint.padEnd(width)}  ok ${e.ok}/${rounds}  first ${e.firstMs}ms  median ${e.medianMs}ms  max ${e.maxMs}ms  ${cache}${e.failed ? `  FAILED ${e.failureStatuses.join(",")}` : ""}`,
  );
}
console.log(`\n${report.summary.failed}/${report.summary.requests} requests failed`);
console.log(`${report.summary.redirected}/${report.summary.requests} requests were redirected first`);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${out}`);
