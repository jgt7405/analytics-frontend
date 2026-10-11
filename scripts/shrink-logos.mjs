#!/usr/bin/env node
// Shrinks logo PNGs in place to the largest size the site shows them at
// (2x, for high-density screens and the 2x image export) with a 256-color
// palette. Logos are served as-is: next.config.ts has images.unoptimized,
// so nothing resizes them on the way out.
//
//   team_logos: 128x128, the team page's 64 px header logo at 2x.
//   conf_logos: 600x128, up to 48 px tall at the widest logo's 4.7:1 (2x).
//
// Run after adding or replacing a logo:
//   node scripts/shrink-logos.mjs                 # both folders
//   node scripts/shrink-logos.mjs path/to/a.png   # specific files
//
// Files already within the box are rewritten only if re-encoding makes them
// smaller, so a second run is a near no-op. sharp comes with Next.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const FOLDERS = {
  "public/images/team_logos": { width: 128, height: 128 },
  "public/images/conf_logos": { width: 600, height: 128 },
};

function boxFor(file) {
  const folder = path.dirname(path.normalize(file));
  const box = FOLDERS[folder];
  if (!box) throw new Error(`${file}: not in ${Object.keys(FOLDERS).join(" or ")}`);
  return box;
}

async function shrink(file) {
  const box = boxFor(file);
  const input = await readFile(file);
  const meta = await sharp(input).metadata();
  const output = await sharp(input)
    .resize(box.width, box.height, { fit: "inside", withoutEnlargement: true })
    .png({ palette: true, colors: 256, dither: 0, compressionLevel: 9, effort: 10 })
    .toBuffer();
  const tooBig = (meta.width ?? 0) > box.width || (meta.height ?? 0) > box.height;
  if (!tooBig && output.length >= input.length) return [input.length, input.length];
  await writeFile(file, output);
  return [input.length, output.length];
}

const args = process.argv.slice(2);
const files = [];
if (args.length) {
  files.push(...args);
} else {
  for (const folder of Object.keys(FOLDERS)) {
    for (const name of await readdir(folder)) {
      // compare_*.png in team_logos is a saved chart export, not a logo.
      if (name.endsWith(".png") && !name.startsWith("compare_")) {
        files.push(path.join(folder, name));
      }
    }
  }
}

let before = 0;
let after = 0;
for (const file of files) {
  const [b, a] = await shrink(file);
  before += b;
  after += a;
}
console.log(
  `${files.length} files: ${(before / 1024).toFixed(0)} kB -> ${(after / 1024).toFixed(0)} kB`,
);
