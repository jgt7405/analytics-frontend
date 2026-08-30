import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, "../..");
const logoDir = path.join(project, "public/images/team_logos");
const brandPath = path.join(project, "public/images/JThom_Logo_Football.png");

const raw = `Team\t2025\t2026
Air Force\t0.001\t0.012
Akron\t0\t0
Alabama\t0.767\t0.395
Appalachian State\t0.004\t0
Arizona\t0.001\t0.062
Arizona State\t0.229\t0.023
Arkansas\t0.013\t0
Arkansas State\t0\t0.004
Army\t0.024\t0.027
Auburn\t0.052\t0.052
Ball State\t0\t0
Baylor\t0.114\t0.009
Boise State\t0.486\t0.205
Boston College\t0.002\t0
Bowling Green\t0.002\t0
Buffalo\t0.01\t0.002
BYU\t0.089\t0.288
California\t0\t0.002
Central Michigan\t0\t0.002
Charlotte\t0\t0
Cincinnati\t0.011\t0.005
Clemson\t0.637\t0.077
Coastal Carolina\t0.001\t0
Colorado\t0.003\t0
Colorado State\t0.001\t0
Connecticut\t0.002\t0
Delaware\t0\t0.001
Duke\t0.018\t0.013
East Carolina\t0.007\t0.033
Eastern Michigan\t0\t0
FIU\t0.002\t0.001
Florida\t0.275\t0.08
Florida Atlantic\t0\t0
Florida State\t0.014\t0.016
Fresno State\t0.002\t0.014
Georgia\t0.773\t0.703
Georgia Southern\t0.01\t0
Georgia State\t0\t0
Georgia Tech\t0.038\t0.016
Hawaii\t0\t0.014
Houston\t0\t0.029
Illinois\t0.097\t0.054
Indiana\t0.165\t0.799
Iowa\t0.046\t0.122
Iowa State\t0.197\t0.007
Jacksonville State\t0.005\t0.008
James Madison\t0.043\t0.148
Kansas\t0.038\t0.005
Kansas State\t0.149\t0.038
Kennesaw State\t0\t0.003
Kent State\t0\t0
Kentucky\t0.003\t0.005
Liberty\t0.099\t0.01
Louisiana Tech\t0.003\t0.006
Louisiana-Lafayette\t0.012\t0.01
Louisiana-Monroe\t0\t0
Louisville\t0.12\t0.139
LSU\t0.443\t0.286
Marshall\t0.005\t0.014
Maryland\t0\t0.002
Massachusetts\t0\t0
Memphis\t0.044\t0.013
Miami\t0.253\t0.724
Miami (OH)\t0.005\t0.013
Michigan\t0.429\t0.267
Michigan State\t0\t0.003
Middle Tennessee\t0\t0
Minnesota\t0.046\t0.009
Mississippi State\t0\t0
Missouri\t0.064\t0.1
Missouri State\t0\t0
Navy\t0.08\t0.114
Nebraska\t0.042\t0.027
Nevada\t0\t0
New Mexico\t0\t0.037
New Mexico State\t0\t0
North Carolina\t0.003\t0
North Carolina State\t0.006\t0.019
North Dakota State\t0\t0.048
North Texas\t0.001\t0.016
Northern Illinois\t0.001\t0
Northwestern\t0\t0.009
Notre Dame\t0.614\t0.715
Ohio\t0.06\t0.012
Ohio State\t0.851\t0.885
Oklahoma\t0.131\t0.305
Oklahoma State\t0.001\t0.003
Old Dominion\t0.001\t0.031
Ole Miss\t0.303\t0.421
Oregon\t0.586\t0.768
Oregon State\t0.009\t0.001
Penn State\t0.807\t0.209
Pittsburgh\t0.009\t0.032
Purdue\t0\t0
Rice\t0\t0
Rutgers\t0.007\t0.001
Sacramento State\t0\t0
Sam Houston\t0\t0
San Diego State\t0\t0.026
San Jose State\t0.012\t0
SMU\t0.162\t0.175
South Alabama\t0.005\t0
South Carolina\t0.218\t0.052
South Florida\t0.006\t0.072
Southern Miss\t0\t0.001
Stanford\t0\t0
Syracuse\t0.003\t0
TCU\t0.107\t0.058
Temple\t0\t0
Tennessee\t0.332\t0.193
Texas\t0.792\t0.648
Texas A&M\t0.238\t0.404
Texas State\t0.004\t0.009
Texas Tech\t0.11\t0.678
Toledo\t0.066\t0.034
Troy\t0.004\t0.006
Tulane\t0.168\t0.053
Tulsa\t0\t0
UAB\t0\t0
UCF\t0.004\t0.003
UCLA\t0.001\t0.004
UNLV\t0.062\t0.056
USC\t0.119\t0.305
Utah\t0.089\t0.206
Utah State\t0.001\t0.001
UTEP\t0\t0
UTSA\t0.024\t0.035
Vanderbilt\t0.008\t0.074
Virginia\t0\t0.061
Virginia Tech\t0.011\t0.017
Wake Forest\t0\t0.006
Washington\t0.039\t0.18
Washington State\t0.001\t0.011
West Virginia\t0.001\t0.001
Western Kentucky\t0.034\t0.069
Western Michigan\t0\t0.034
Wisconsin\t0.013\t0.005
Wyoming\t0\t0`;

const teams = raw.trim().split("\n").slice(1).map((line) => {
  const [team, a, b] = line.split("\t");
  return { team, y2025: Number(a), y2026: Number(b) };
});

const specialSlugs = {
  "East Carolina": "east_carolina",
  "Louisiana-Lafayette": "louisiana-lafayette",
  "Louisiana-Monroe": "louisiana-monroe",
  "Miami (OH)": "miami_(oh)",
  "Ole Miss": "ole_miss",
  "Texas A&M": "texas_a&m",
};

const slug = (name) => specialSlugs[name] ?? name.toLowerCase().replaceAll(" ", "_");
const dataUri = (file) => `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
const esc = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const missing = teams.filter(({ team }) => !fs.existsSync(path.join(logoDir, `${slug(team)}.png`)));
if (missing.length) throw new Error(`Missing logos: ${missing.map((d) => d.team).join(", ")}`);

const W = 2160;
const H = 2400;
const plot = { x: 260, y: 255, size: 1760 };
const max = 0.9;
const px = (v) => plot.x + (v / max) * plot.size;
const py = (v) => plot.y + plot.size - (v / max) * plot.size;
const ticks = Array.from({ length: 10 }, (_, i) => i / 10);

const major = teams.filter((d) => Math.max(d.y2025, d.y2026) > 0.15);

const logoMarkup = teams
  .sort((a, b) => Math.max(a.y2025, a.y2026) - Math.max(b.y2025, b.y2026))
  .map((d) => {
    const important = Math.max(d.y2025, d.y2026) > 0.15;
    const size = d.team === "Ohio State" ? 50 : important ? 66 : 42;
    const display2025 = d.team === "Oklahoma" ? d.y2025 + 0.02 : d.y2025;
    const uri = dataUri(path.join(logoDir, `${slug(d.team)}.png`));
    return `<g class="team" transform="translate(${px(display2025).toFixed(1)} ${py(d.y2026).toFixed(1)})">
      <title>${esc(d.team)} — 2025 ${(d.y2025 * 100).toFixed(1)}%, 2026 ${(d.y2026 * 100).toFixed(1)}%</title>
      <image href="${uri}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>
    </g>`;
  }).join("\n");

const groupSpecs = [
  { label: "HIGH EXPECTATIONS BOTH YEARS", x0: .55, x1: .90, y0: .60, y1: .90, lx: .72, ly: .82, width: 390, color: "#078fad" },
  { label: "HIGHLY OPTIMISTIC IN 2026", x0: .07, x1: .29, y0: .61, y1: .86, lx: .33, ly: .845, width: 360, color: "#12a26c" },
  { label: "LARGE DOWNGRADES IN 2026", x0: .59, x1: .88, y0: .05, y1: .45, lx: .70, ly: .31, width: 340, color: "#d65760" },
  { label: "MODERATE DOWNGRADES IN 2026", x0: .30, x1: .52, y0: .16, y1: .32, lx: .41, ly: .125, width: 405, color: "#e28a47" },
  { label: "MODERATE UPGRADES IN 2026", x0: .05, x1: .34, y0: .25, y1: .46, lx: .19, ly: .49, width: 380, color: "#7b68ba" },
];

const groupsMarkup = groupSpecs.map((g) => {
  const x = px(g.x0), y = py(g.y1);
  const width = px(g.x1) - px(g.x0), height = py(g.y0) - py(g.y1);
  const lx = px(g.lx), ly = py(g.ly);
  return `<g class="callout" style="--accent:${g.color}">
    <rect class="outline" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" rx="120"/>
    <rect class="label-bg" x="${(lx - g.width / 2).toFixed(1)}" y="${(ly - 23).toFixed(1)}" width="${g.width}" height="46" rx="23"/>
    <text x="${lx.toFixed(1)}" y="${(ly + 8).toFixed(1)}" text-anchor="middle">${g.label}</text>
  </g>`;
}).join("\n");

const grid = ticks.map((t) => {
  const x = px(t), y = py(t);
  return `<line x1="${x}" y1="${plot.y}" x2="${x}" y2="${plot.y + plot.size}" class="grid"/>
  <line x1="${plot.x}" y1="${y}" x2="${plot.x + plot.size}" y2="${y}" class="grid"/>
  <text x="${x}" y="${plot.y + plot.size + 54}" class="tick" text-anchor="middle">${Math.round(t * 100)}%</text>
  <text x="${plot.x - 34}" y="${y + 10}" class="tick" text-anchor="end">${Math.round(t * 100)}%</text>`;
}).join("\n");

const increases = [...teams].sort((a, b) => (b.y2026 - b.y2025) - (a.y2026 - a.y2025)).slice(0, 5);
const decreases = [...teams].sort((a, b) => (a.y2026 - a.y2025) - (b.y2026 - b.y2025)).slice(0, 5);

const moverRow = (items, y, direction) => items.map((d, i) => {
  const delta = Math.round((d.y2026 - d.y2025) * 100);
  const x = 940 + i * 210;
  const uri = dataUri(path.join(logoDir, `${slug(d.team)}.png`));
  return `<g transform="translate(${x} ${y})">
    <title>${esc(d.team)}: ${delta >= 0 ? "+" : ""}${delta}%</title>
    <image href="${uri}" x="-37" y="-32" width="64" height="64" preserveAspectRatio="xMidYMid meet"/>
    <text x="43" y="12" class="mover-delta ${direction}">${delta >= 0 ? "+" : ""}${delta}%</text>
  </g>`;
}).join("\n");

const brand = dataUri(brandPath);
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="footerBrand" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#087f9a"/>
    <stop offset="1" stop-color="#09a8c6"/>
  </linearGradient>
  <filter id="softShadow" x="-10%" y="-20%" width="120%" height="150%">
    <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#557483" flood-opacity=".18"/>
  </filter>
</defs>
<style>
  text { font-family: Inter, Arial, sans-serif; }
  .title { font-size: 66px; font-weight: 900; letter-spacing: -1.5px; fill: #0799b8; }
  .grid { stroke: #d8e3e8; stroke-width: 2; }
  .tick { font-size: 34px; font-weight: 800; fill: #536c7b; }
  .axis-label { font-size: 32px; font-weight: 900; letter-spacing: 1px; fill: #082235; }
  .zone { font-size: 23px; font-weight: 900; letter-spacing: 2px; }
  .mover-label { font-size: 25px; font-weight: 900; letter-spacing: 1.5px; }
  .increase-label { fill: #138f5b; }
  .decrease-label { fill: #c94e58; }
  .mover-delta { font-size: 30px; font-weight: 900; }
  .up { fill: #19a96b; } .down { fill: #d85b62; }
  .callout .outline { fill: none; stroke: var(--accent); stroke-width: 4; stroke-dasharray: 13 9; opacity: .75; }
  .callout .label-bg { fill: white; stroke: var(--accent); stroke-width: 2.5; }
  .callout text { fill: var(--accent); font-size: 18px; font-weight: 900; letter-spacing: .7px; }
  .footer-kicker { fill: #c5f5ff; font-size: 20px; font-weight: 800; letter-spacing: 2.5px; }
  .footer-title { fill: white; font-size: 31px; font-weight: 900; letter-spacing: .5px; }
  .trend-arrow { fill: none; stroke: white; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; }
</style>
<rect width="${W}" height="${H}" fill="#f3f7f9"/>
<rect x="0" y="0" width="${W}" height="220" fill="#ffffff"/>
<image href="${brand}" x="80" y="30" width="300" height="160" preserveAspectRatio="xMidYMid meet"/>
<text x="440" y="132" class="title">2025 vs 2026 Preseason CFP Projections</text>
<line x1="440" y1="174" x2="2040" y2="174" stroke="#d7e4e9" stroke-width="2"/>

<rect x="${plot.x}" y="${plot.y}" width="${plot.size}" height="${plot.size}" rx="8" fill="#ffffff" stroke="#cbdbe2" stroke-width="3"/>
${grid}
<line x1="${plot.x}" y1="${plot.y + plot.size}" x2="${plot.x + plot.size}" y2="${plot.y}" stroke="#0b94b2" stroke-width="5" stroke-dasharray="18 14" opacity=".7"/>
<text x="${plot.x + 62}" y="${plot.y + 66}" class="zone" fill="#0b94b2">HIGHER IN 2026 ↑</text>
<text x="${plot.x + plot.size - 62}" y="${plot.y + plot.size - 44}" class="zone" fill="#bd5b5b" text-anchor="end">LOWER IN 2026 ↓</text>
${groupsMarkup}
${logoMarkup}

<text x="${plot.x + plot.size / 2}" y="2120" class="axis-label" text-anchor="middle">2025 PRESEASON PLAYOFF PROBABILITY</text>
<text x="84" y="${plot.y + plot.size / 2}" class="axis-label" text-anchor="middle" transform="rotate(-90 84 ${plot.y + plot.size / 2})">2026 PRESEASON PLAYOFF PROBABILITY</text>

<g filter="url(#softShadow)">
  <rect x="120" y="2160" width="1920" height="220" rx="22" fill="#ffffff"/>
  <path d="M142 2160 H540 V2380 H142 Q120 2380 120 2358 V2182 Q120 2160 142 2160Z" fill="url(#footerBrand)"/>
  <rect x="540" y="2160" width="1500" height="110" fill="#effaf5"/>
  <path d="M540 2270 H2040 V2358 Q2040 2380 2018 2380 H540Z" fill="#fff3f3"/>
</g>
<line x1="540" y1="2270" x2="2040" y2="2270" stroke="#d7e4e9" stroke-width="2"/>
<text x="330" y="2248" class="footer-kicker" text-anchor="middle">2026 VS 2025</text>
<text x="330" y="2292" class="footer-title" text-anchor="middle">PROJECTIONS</text>
<circle cx="580" cy="2215" r="28" fill="#19a96b"/>
<path class="trend-arrow" d="M580 2228 V2203 M569 2214 L580 2203 L591 2214"/>
<circle cx="580" cy="2325" r="28" fill="#d85b62"/>
<path class="trend-arrow" d="M580 2312 V2337 M569 2326 L580 2337 L591 2326"/>
<text x="625" y="2205" class="mover-label increase-label"><tspan x="625">BIGGEST</tspan><tspan x="625" dy="31">INCREASE</tspan></text>
<text x="625" y="2315" class="mover-label decrease-label"><tspan x="625">BIGGEST</tspan><tspan x="625" dy="31">DECREASE</tspan></text>
${moverRow(increases, 2215, "up")}
${moverRow(decreases, 2325, "down")}
</svg>`;

fs.mkdirSync(here, { recursive: true });
fs.writeFileSync(path.join(here, "playoff-probability-scatter-2025-vs-2026.svg"), svg);
fs.writeFileSync(path.join(here, "playoff-probabilities-2025-vs-2026.tsv"), raw);
console.log(`Rendered ${teams.length} teams; ${major.length} emphasized logos; no missing logos.`);
