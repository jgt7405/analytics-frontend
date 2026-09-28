// Colors and small helpers shared by the what-if tables.

import { type NcaaAllTeam, type WhatIfTeamResult } from "@/hooks/useBasketballWhatIf";
import { getCellColor } from "@/lib/color-utils";
import { type ExtraColumn } from "./types";

export const TEAL_COLOR = "rgb(0, 151, 178)";

// TWV delta colors
const TWV_BLUE = [24, 98, 123];
const TWV_WHITE = [255, 255, 255];
const TWV_YELLOW = [255, 230, 113];

export function getDeltaColor(delta: number, maxAbs: number) {
  if (Math.abs(delta) < 0.05 || maxAbs === 0)
    return { backgroundColor: "transparent", color: "#000000" };
  const ratio = Math.min(Math.abs(delta) / maxAbs, 1);
  const t = delta > 0 ? TWV_BLUE : TWV_YELLOW;
  const r = Math.round(TWV_WHITE[0] + (t[0] - TWV_WHITE[0]) * ratio);
  const g = Math.round(TWV_WHITE[1] + (t[1] - TWV_WHITE[1]) * ratio);
  const b = Math.round(TWV_WHITE[2] + (t[2] - TWV_WHITE[2]) * ratio);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: brightness > 140 ? "#374151" : "#ffffff",
  };
}

export function getStandingProb(team: WhatIfTeamResult, standing: number): number {
  const key = `standing_${standing}_prob` as keyof WhatIfTeamResult;
  return (team[key] as number) ?? 0;
}


// – NCAA table –
// Auto %, At-Large % and Avg Seed after the bid % columns. Values describe the
// displayed row (what-if once calculated), like "What If".
export const NCAA_EXTRA_COLUMNS: ExtraColumn[] = [
  {
    key: "auto",
    label: "Auto %",
    value: (t) => t.ncaa_auto_bid_pct,
    format: (v) => `${v.toFixed(1)}%`,
    color: (v) => getCellColor(v, "blue"),
  },
  {
    key: "at_large",
    label: "At-Large %",
    value: (t) => t.ncaa_at_large_pct,
    format: (v) => `${v.toFixed(1)}%`,
    color: (v) => getCellColor(v, "blue"),
  },
  {
    key: "avg_seed",
    label: "Avg Seed",
    value: (t) => t.average_seed,
    format: (v) => v.toFixed(1),
  },
];

export const ncaaBidProb = (t: WhatIfTeamResult) => t.tournament_bid_pct ?? 0;

/** An all-teams row as a WhatIfTeamResult, so the shared table can render it. */
export function ncaaAllTeamResult(
  t: NcaaAllTeam,
  which: "current" | "whatif",
): WhatIfTeamResult {
  const bid = which === "current" ? t.current_bid_pct : t.whatif_bid_pct;
  const auto = which === "current" ? t.current_auto_pct : t.whatif_auto_pct;
  return {
    team_id: t.team_id,
    team_name: t.team_name,
    conference: t.conference,
    logo_url: t.logo_url,
    tournament_bid_pct: bid,
    ncaa_auto_bid_pct: auto,
    ncaa_at_large_pct: Math.max(bid - auto, 0),
    average_seed:
      which === "current" ? t.current_average_seed : t.whatif_average_seed,
  };
}

// What-if probability of finishing 1st, top 4 and top 8 (sums of the
// standing_N_prob columns).
export const firstPlaceProb = (t: WhatIfTeamResult) => t.standing_1_prob ?? 0;
export const top4Prob = (t: WhatIfTeamResult) => {
  let sum = 0;
  for (let i = 1; i <= 4; i++) sum += getStandingProb(t, i);
  return sum;
};
export const top8Prob = (t: WhatIfTeamResult) => {
  let sum = 0;
  for (let i = 1; i <= 8; i++) sum += getStandingProb(t, i);
  return sum;
};
