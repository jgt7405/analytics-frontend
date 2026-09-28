#!/usr/bin/env node
// Screenshot comparison against the base branch (plan step 7).
//
//   npm run visual:compare                        # base: origin/main
//   npm run visual:compare -- --base <git ref>    # e.g. the PR's base commit (CI)
//   npm run visual:compare -- --skip-head-build   # this checkout is already built
//
// 1. Checks the base ref out into a temporary worktree, installs and builds it.
// 2. Serves that build and takes the reference shots of e2e/visual.e2e.ts
//    (this checkout's tests and fixtures, so both sides get the same data).
// 3. Builds this checkout and compares it against those shots.
// Both sides render on the same machine, so no screenshots are committed.
// Differences are written to test-results/ (expected, actual and diff images).

import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
function take(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const [, value] = args.splice(index, 2);
  return value;
}
const skipHeadBuild = args.includes("--skip-head-build");
const baseRef = take("base", "origin/main");
const baseDir = take("base-dir", join(tmpdir(), "visual-base"));
const snapshotDir = resolve(".visual/snapshots");

function run(command, options = {}) {
  console.log(`\n$ ${command}${options.cwd ? `   (in ${options.cwd})` : ""}`);
  execSync(command, { stdio: "inherit", ...options, env: { ...process.env, ...options.env } });
}

function removeBaseWorktree() {
  if (!existsSync(baseDir)) return;
  try {
    run(`git worktree remove --force "${baseDir}"`);
  } catch {
    rmSync(baseDir, { recursive: true, force: true });
    run("git worktree prune");
  }
}

if (skipHeadBuild && !existsSync(".next/BUILD_ID")) {
  console.error("--skip-head-build: this checkout has no build yet; run `npm run build` first.");
  process.exit(1);
}

rmSync(snapshotDir, { recursive: true, force: true });
removeBaseWorktree();
try {
  run(`git worktree add --detach "${baseDir}" ${baseRef}`);
  run("npm ci --no-audit --no-fund", { cwd: baseDir });
  run("npm run build", { cwd: baseDir });
  run("npx playwright test e2e/visual.e2e.ts --workers=1 --update-snapshots", {
    env: { VISUAL_SNAPSHOT_DIR: snapshotDir, E2E_APP_DIR: baseDir },
  });
} finally {
  removeBaseWorktree();
}

if (!skipHeadBuild) run("npm run build");
run("npx playwright test e2e/visual.e2e.ts --workers=1", {
  env: { VISUAL_SNAPSHOT_DIR: snapshotDir },
});
console.log(`\nScreenshots match ${baseRef}.`);
