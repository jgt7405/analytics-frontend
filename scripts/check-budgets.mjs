#!/usr/bin/env node
// Fail when a route's first-load JS (totalKb from route-sizes.mjs) grows past
// its budget in scripts/bundle-budgets.json. Budgets start from the step 1
// baseline (docs/baselines/); raise one deliberately with --update after a
// reviewed change that is worth the extra weight.
//
// Usage (after `npm run build`):
//   npm run size:check             # compare against budgets
//   npm run size:check -- --update # rewrite budgets from the current build

import { readFileSync, writeFileSync } from "node:fs";
import { getRouteSizes } from "./route-sizes.mjs";

const BUDGETS_PATH = new URL("./bundle-budgets.json", import.meta.url);
const budgets = JSON.parse(readFileSync(BUDGETS_PATH, "utf8"));
const routes = getRouteSizes();

if (process.argv.includes("--update")) {
  budgets.routes = Object.fromEntries(routes.map((r) => [r.route, r.totalKb]));
  writeFileSync(BUDGETS_PATH, `${JSON.stringify(budgets, null, 2)}\n`);
  console.log(`Updated budgets for ${routes.length} routes.`);
  process.exit(0);
}

const { tolerancePct, toleranceKb } = budgets;
const over = [];
const unbudgeted = [];
for (const { route, totalKb } of routes) {
  const budget = budgets.routes[route];
  if (budget === undefined) {
    unbudgeted.push(`${route} (${totalKb} kB)`);
    continue;
  }
  const limit = budget + Math.max(toleranceKb, (budget * tolerancePct) / 100);
  if (totalKb > limit) {
    over.push(`${route}: ${totalKb} kB > limit ${limit.toFixed(1)} kB (budget ${budget} kB)`);
  }
}

if (unbudgeted.length) {
  console.log(`New routes without a budget (add with --update):\n  ${unbudgeted.join("\n  ")}`);
}
if (over.length) {
  console.error(`Routes over their JS budget:\n  ${over.join("\n  ")}`);
  process.exit(1);
}
console.log(`All ${routes.length - unbudgeted.length} budgeted routes are within budget.`);
