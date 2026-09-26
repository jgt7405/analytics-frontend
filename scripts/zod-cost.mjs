#!/usr/bin/env node
// Measures what Zod validation costs on realistic payload sizes (plan step 4,
// item 6: "measure the cost before validating large historical or chart
// payloads"). Synthetic data shaped like the backend's responses.
//
//   node scripts/zod-cost.mjs

import { z } from "zod";

const RUNS = 50;

function time(label, schema, payload) {
  const bytes = JSON.stringify(payload).length;
  for (let i = 0; i < 5; i++) schema.parse(payload); // warm up
  const ms = [];
  for (let i = 0; i < RUNS; i++) {
    const t = performance.now();
    schema.parse(payload);
    ms.push(performance.now() - t);
  }
  ms.sort((a, b) => a - b);
  const jsonMs = (() => {
    const text = JSON.stringify(payload);
    const t = performance.now();
    for (let i = 0; i < RUNS; i++) JSON.parse(text);
    return (performance.now() - t) / RUNS;
  })();
  console.log(
    `${label.padEnd(44)} ${(bytes / 1024).toFixed(0).padStart(6)} kB  ` +
      `zod p50 ${ms[RUNS / 2].toFixed(2)} ms  p95 ${ms[Math.floor(RUNS * 0.95)].toFixed(2)} ms  ` +
      `(JSON.parse ${jsonMs.toFixed(2)} ms)`,
  );
}

// All D1 basketball teams, ~40 fields each (standings / seed tables).
const team = (i) => {
  const row = { team_name: `Team ${i}`, team_id: String(i), logo_url: `/images/team_logos/t${i}.png` };
  for (let f = 0; f < 30; f++) row[`metric_${f}`] = Math.random() * 100;
  row.standings_distribution = Object.fromEntries(Array.from({ length: 16 }, (_, k) => [String(k + 1), Math.random() * 10]));
  return row;
};
const table = { data: Array.from({ length: 365 }, (_, i) => team(i)), conferences: Array.from({ length: 32 }, (_, i) => `Conf ${i}`) };

const envelope = z
  .object({
    data: z.array(z.object({ team_name: z.string() }).passthrough()),
    conferences: z.array(z.string()).optional(),
  })
  .passthrough();

const fullRow = z.object({
  team_name: z.string(),
  team_id: z.string(),
  logo_url: z.string(),
  ...Object.fromEntries(Array.from({ length: 30 }, (_, f) => [`metric_${f}`, z.number()])),
  standings_distribution: z.record(z.number()),
});
const fullTable = z.object({ data: z.array(fullRow), conferences: z.array(z.string()) });

// Season-long history chart: every team, one point per day (~120 days).
const history = {
  timeline_data: Array.from({ length: 365 * 120 }, (_, i) => ({
    team_name: `Team ${i % 365}`,
    date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
    value: Math.random() * 100,
    team_info: { logo_url: "/x.png", primary_color: "#000000" },
  })),
};
const historySchema = z.object({
  timeline_data: z.array(
    z.object({
      team_name: z.string(),
      date: z.string(),
      value: z.number(),
      team_info: z.object({ logo_url: z.string(), primary_color: z.string() }),
    }),
  ),
});

console.log(`node ${process.version}, zod ${(await import("zod/package.json", { with: { type: "json" } })).default.version}`);
time("envelope, all-teams table (365 rows)", envelope, table);
time("every field, all-teams table (365 rows)", fullTable, table);
time("every field, season history (43,800 points)", historySchema, history);
