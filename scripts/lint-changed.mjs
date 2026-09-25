#!/usr/bin/env node
// Stricter lint for files changed on this branch: rules that are warnings
// repo-wide become errors here, so new code meets the bar without forcing a
// repo-wide cleanup first (docs/ARCHITECTURE_PLAN.md, step 2).
//
// Usage:
//   npm run lint:changed               # compare against origin/main
//   npm run lint:changed -- <base-ref> # compare against another ref

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const STRICT_RULES = {
  "@typescript-eslint/no-explicit-any": "error",
};

const base = process.argv[2] ?? `origin/${process.env.GITHUB_BASE_REF || "main"}`;

let changed;
try {
  changed = execFileSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`],
    { encoding: "utf8" },
  )
    .split("\n")
    .filter((file) => /^src\/.*\.(ts|tsx)$/.test(file) && existsSync(file));
} catch {
  console.error(`Could not diff against ${base}. Fetch it first (git fetch origin main).`);
  process.exit(1);
}

if (changed.length === 0) {
  console.log(`No changed TypeScript files under src/ since ${base}.`);
  process.exit(0);
}

console.log(`Strict lint on ${changed.length} changed file(s) since ${base}:`);
const result = spawnSync(
  "npx",
  ["eslint", "--rule", JSON.stringify(STRICT_RULES), ...changed],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
