// components/features/basketball/WhatIfTeamSummary.tsx
// Shows what-if results for a single team based on selected game outcomes
// Uses the same selectedTeamId as NextGameImpact (lifted to parent)

"use client";

import type { WhatIfGame, WhatIfTeamResult } from "@/hooks/useBasketballWhatIf";
import { getCellColor } from "@/lib/color-utils";
import { Camera, Loader } from "lucide-react";
import { useMemo, useRef, useState } from "react";

const TWV_BLUE = [24, 98, 123];
const TWV_WHITE = [255, 255, 255];
const TWV_YELLOW = [255, 230, 113];
const TEAL_COLOR = "rgb(0, 151, 178)";

function getDeltaColor(delta: number, maxAbs: number) {
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

function getStandingProb(team: WhatIfTeamResult, standing: number): number {
  const key = `standing_${standing}_prob` as keyof WhatIfTeamResult;
  return (team[key] as number) ?? 0;
}

async function captureScreenshot(
  element: HTMLElement,
  filename: string,
  chartTitle?: string,
  teamLogoUrl?: string,
) {
  if (typeof window === "undefined") return;
  let html2canvas = (window as unknown as Record<string, unknown>)
    .html2canvas as
    | ((el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement>)
    | undefined;
  if (!html2canvas) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load html2canvas"));
      document.body.appendChild(s);
    });
    html2canvas = (window as unknown as Record<string, unknown>).html2canvas as
      | ((el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement>)
      | undefined;
  }
  if (!html2canvas) return;
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-no-screenshot]").forEach((el) => el.remove());
  const contentWidth = Math.min(
    element.scrollWidth + 48,
    element.offsetWidth + 48,
  );
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:fixed;left:-9999px;top:0;background:#fff;padding:16px 24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif;width:${contentWidth}px;z-index:-1;overflow:visible;`;
  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;";
  const logo = document.createElement("img");
  logo.src = "/images/JThom_Logo.png";
  logo.style.cssText = "height:40px;width:auto;";
  const titleSpan = document.createElement("div");
  titleSpan.textContent = chartTitle || "What If Summary by Team";
  titleSpan.style.cssText =
    "font-size:13px;font-weight:500;color:#374151;text-align:center;flex:1;padding:0 12px;";
  // Right side: team logo above date
  const rightCol = document.createElement("div");
  rightCol.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:2px;";
  if (teamLogoUrl) {
    const teamLogo = document.createElement("img");
    teamLogo.src = teamLogoUrl;
    teamLogo.style.cssText = "height:28px;width:28px;object-fit:contain;";
    rightCol.appendChild(teamLogo);
  }
  const date = document.createElement("div");
  date.textContent = new Date().toLocaleDateString();
  date.style.cssText = "font-size:12px;color:#6b7280;";
  rightCol.appendChild(date);
  header.appendChild(logo);
  header.appendChild(titleSpan);
  header.appendChild(rightCol);
  wrapper.appendChild(header);
  clone.style.cssText = "overflow:visible!important;width:100%!important;";
  wrapper.appendChild(clone);
  // Explainer text for screenshot
  const explainer = document.createElement("div");
  explainer.style.cssText =
    "margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;line-height:1.4;";
  explainer.innerHTML =
    "Shows how selected game outcomes affect this team's seed probabilities. Current reflects pre-selection probabilities; What If reflects updated probabilities after applying selected game results.";
  wrapper.appendChild(explainer);
  document.body.appendChild(wrapper);
  await new Promise((r) => setTimeout(r, 400));
  const canvas = await html2canvas(wrapper, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
  });
  document.body.removeChild(wrapper);
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

const COL_METRIC = { minWidth: "110px" };
const COL_DATA = { minWidth: "65px", width: "65px" };

interface WhatIfTeamSummaryProps {
  baseline: WhatIfTeamResult[];
  whatif: WhatIfTeamResult[];
  games: WhatIfGame[];
  selections: Map<number, number>;
  hasCalculated: boolean;
  selectedTeamId: number | null;
}

export default function WhatIfTeamSummary({
  baseline,
  whatif,
  games,
  selections,
  hasCalculated,
  selectedTeamId,
}: WhatIfTeamSummaryProps) {
  const [capturing, setCapturing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const baselineMap = useMemo(
    () => new Map(baseline.map((t) => [t.team_id, t])),
    [baseline],
  );

  // Don't render if no team selected or no calculation done
  if (
    !selectedTeamId ||
    !hasCalculated ||
    baseline.length === 0 ||
    whatif.length === 0
  )
    return null;

  const blTeam = baselineMap.get(selectedTeamId);
  const wiTeam = whatif.find((t) => t.team_id === selectedTeamId);

  if (!blTeam || !wiTeam) return null;

  const numTeams = baseline.length;

  // Build selected games display
  const selectedGames = Array.from(selections.entries())
    .map(([gid, wid]) => {
      const g = games.find((x) => x.game_id === gid);
      return g ? { game: g, winnerId: wid } : null;
    })
    .filter(Boolean) as Array<{ game: WhatIfGame; winnerId: number }>;

  type MetricDef = {
    label: string;
    getValue: (t: WhatIfTeamResult) => number;
    isPercent: boolean;
    hideIfZero?: boolean;
  };

  // Conference metrics
  const confMetrics: MetricDef[] = [
    {
      label: "#1 Seed Prob",
      getValue: (t) => t.standing_1_prob ?? 0,
      isPercent: true,
    },
    {
      label: "Top 4 Seed Prob",
      getValue: (t) => {
        let s = 0;
        for (let i = 1; i <= 4; i++) s += getStandingProb(t, i);
        return s;
      },
      isPercent: true,
    },
    {
      label: "Top 8 Seed Prob",
      getValue: (t) => {
        let s = 0;
        for (let i = 1; i <= Math.min(8, numTeams); i++)
          s += getStandingProb(t, i);
        return s;
      },
      isPercent: true,
    },
    {
      label: "Avg Seed",
      getValue: (t) => t.avg_conference_standing ?? 0,
      isPercent: false,
    },
    {
      label: "Proj Conf Wins",
      getValue: (t) => t.avg_projected_conf_wins ?? 0,
      isPercent: false,
    },
  ];

  // NCAA metrics
  const ncaaMetrics: MetricDef[] = [
    {
      label: "In Tourney Prob",
      getValue: (t) => t.tournament_bid_pct ?? 0,
      isPercent: true,
    },
    {
      label: "Avg NCAA Seed",
      getValue: (t) => t.average_seed ?? 0,
      isPercent: false,
      hideIfZero: true,
    },
  ];

  const allMetrics = [...confMetrics, ...ncaaMetrics];
  const maxAbsChange = Math.max(
    ...allMetrics.map((m) => Math.abs(m.getValue(wiTeam) - m.getValue(blTeam))),
    0.1,
  );

  // Helper to format metric values with null handling
  const formatMetric = (
    value: number,
    isPercent: boolean,
    hideIfZero?: boolean,
  ) => {
    if (hideIfZero && value === 0) return "\u2014";
    if (isPercent) return value > 0 ? `${value.toFixed(1)}%` : "";
    return value.toFixed(1);
  };

  // Shared table header
  const tableHeader = (
    <thead>
      <tr className="border-b border-gray-200 text-gray-500">
        <th className="text-left py-1.5 px-2 font-normal" style={COL_METRIC}>
          Metric
        </th>
        <th className="text-center py-1.5 px-2 font-normal" style={COL_DATA}>
          Current
        </th>
        <th className="text-center py-1.5 px-2 font-normal" style={COL_DATA}>
          What If
        </th>
        <th className="text-center py-1.5 px-2 font-normal" style={COL_DATA}>
          Change
        </th>
      </tr>
    </thead>
  );

  // Shared seed table header
  const seedTableHeader = (
    <thead>
      <tr className="border-b border-gray-200 text-gray-500">
        <th className="text-left py-1.5 px-2 font-normal" style={COL_METRIC}>
          Seed
        </th>
        <th className="text-center py-1.5 px-2 font-normal" style={COL_DATA}>
          Current
        </th>
        <th className="text-center py-1.5 px-2 font-normal" style={COL_DATA}>
          What If
        </th>
        <th className="text-center py-1.5 px-2 font-normal" style={COL_DATA}>
          Change
        </th>
      </tr>
    </thead>
  );

  // Render a metrics table body
  const renderMetricsRows = (metrics: MetricDef[]) =>
    metrics.map(({ label, getValue, isPercent, hideIfZero }) => {
      const cur = getValue(blTeam);
      const wi = getValue(wiTeam);
      const change = wi - cur;
      return (
        <tr key={label} className="border-b border-gray-100">
          <td className="py-1.5 px-2 text-sm">{label}</td>
          <td
            className="text-center py-1.5 px-2 tabular-nums"
            style={isPercent ? getCellColor(cur, "blue") : undefined}
          >
            {formatMetric(cur, isPercent, hideIfZero)}
          </td>
          <td
            className="text-center py-1.5 px-2 tabular-nums"
            style={isPercent ? getCellColor(wi, "blue") : undefined}
          >
            {formatMetric(wi, isPercent, hideIfZero)}
          </td>
          <td
            className="text-center py-1.5 px-2 tabular-nums"
            style={getDeltaColor(change, maxAbsChange)}
          >
            {Math.abs(change) < 0.05 || (hideIfZero && cur === 0 && wi === 0)
              ? "\u2014"
              : change > 0
                ? `+${change.toFixed(1)}${isPercent ? "%" : ""}`
                : `${change.toFixed(1)}${isPercent ? "%" : ""}`}
          </td>
        </tr>
      );
    });

  // Conference seed max abs for delta coloring
  const confSeedMaxAbs = Math.max(
    ...Array.from({ length: numTeams }, (_, j) =>
      Math.abs(getStandingProb(wiTeam, j + 1) - getStandingProb(blTeam, j + 1)),
    ),
    0.1,
  );

  // NCAA seed data
  const blBidPct = blTeam.tournament_bid_pct ?? 0;
  const wiBidPct = wiTeam.tournament_bid_pct ?? 0;
  const blDist = blTeam.ncaa_seed_distribution ?? {};
  const wiDist = wiTeam.ncaa_seed_distribution ?? {};
  const allNcaaSeeds = Array.from(
    new Set([...Object.keys(blDist), ...Object.keys(wiDist)]),
  )
    .map(Number)
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);
  const blOutPct = 100 - blBidPct;
  const wiOutPct = 100 - wiBidPct;
  const outChange = wiOutPct - blOutPct;
  const ncaaSeedMaxAbs = Math.max(
    ...allNcaaSeeds.map((s) =>
      Math.abs((wiDist[String(s)] ?? 0) - (blDist[String(s)] ?? 0)),
    ),
    Math.abs(outChange),
    0.1,
  );

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">What If Summary</h4>
        <div className="flex items-center gap-2" data-no-screenshot>
          <button
            onClick={async () => {
              if (!contentRef.current || capturing) return;
              setCapturing(true);
              try {
                await captureScreenshot(
                  contentRef.current,
                  `whatif_summary_${(blTeam.team_name ?? "team").replace(/\s+/g, "_").toLowerCase()}.png`,
                  `What If Summary - ${blTeam.team_name ?? ""}`,
                  blTeam.logo_url,
                );
              } catch (e) {
                console.error("Screenshot failed:", e);
              }
              setCapturing(false);
            }}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition"
            title="Download screenshot"
          >
            {capturing ? (
              <Loader size={12} className="animate-spin" />
            ) : (
              <Camera size={12} />
            )}
            <span className="hidden sm:inline">Screenshot</span>
          </button>
        </div>
      </div>

      <div ref={contentRef}>
        {/* Selected games display */}
        {selectedGames.length > 0 && (
          <div className="mb-3 py-1.5 px-2 bg-gray-50 rounded">
            <p className="text-[10px] text-gray-500 mb-1">
              Selections ({selectedGames.length} game
              {selectedGames.length !== 1 ? "s" : ""}):
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedGames.map(({ game, winnerId }) => {
                const awayWins = winnerId === game.away_team_id;
                return (
                  <div
                    key={game.game_id}
                    className="flex items-center gap-0.5 bg-white rounded"
                    style={{ border: "1px solid #d1d5db", padding: "1px 2px" }}
                  >
                    <span
                      className="rounded"
                      style={{
                        border: awayWins
                          ? `2px solid ${TEAL_COLOR}`
                          : "2px solid transparent",
                        padding: "1px",
                        lineHeight: 0,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={game.away_logo_url}
                        alt={game.away_team}
                        width={12}
                        height={12}
                        className="object-contain inline-block"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </span>
                    <span className="text-[8px] text-gray-300">@</span>
                    <span
                      className="rounded"
                      style={{
                        border: !awayWins
                          ? `2px solid ${TEAL_COLOR}`
                          : "2px solid transparent",
                        padding: "1px",
                        lineHeight: 0,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={game.home_logo_url}
                        alt={game.home_team}
                        width={12}
                        height={12}
                        className="object-contain inline-block"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 1: Conference Tournament Probabilities               */}
        {/* ============================================================ */}
        <h4 className="text-sm font-semibold mb-1">
          Conference Tournament Probabilities
        </h4>
        <table className="w-full text-sm">
          {tableHeader}
          <tbody>{renderMetricsRows(confMetrics)}</tbody>
        </table>

        {/* Conference Seed Distribution (no heading, small visual break) */}
        <div className="mt-3">
          <table className="w-full text-sm">
            {seedTableHeader}
            <tbody>
              {Array.from({ length: numTeams }, (_, i) => {
                const seed = i + 1;
                const cur = getStandingProb(blTeam, seed);
                const wi = getStandingProb(wiTeam, seed);
                const change = wi - cur;
                if (cur === 0 && wi === 0) return null;
                return (
                  <tr key={seed} className="border-b border-gray-100">
                    <td className="py-1.5 px-2">
                      {seed}
                      {seed === 1
                        ? "st"
                        : seed === 2
                          ? "nd"
                          : seed === 3
                            ? "rd"
                            : "th"}
                    </td>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={getCellColor(cur, "blue")}
                    >
                      {cur > 0 ? `${cur.toFixed(1)}%` : ""}
                    </td>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={getCellColor(wi, "blue")}
                    >
                      {wi > 0 ? `${wi.toFixed(1)}%` : ""}
                    </td>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={getDeltaColor(change, confSeedMaxAbs)}
                    >
                      {Math.abs(change) < 0.05
                        ? "\u2014"
                        : change > 0
                          ? `+${change.toFixed(1)}%`
                          : `${change.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ============================================================ */}
        {/* Gray divider                                                 */}
        {/* ============================================================ */}
        <div className="my-4 border-t border-gray-300" />

        {/* ============================================================ */}
        {/* SECTION 2: NCAA Tournament Probabilities                     */}
        {/* ============================================================ */}
        <h4 className="text-sm font-semibold mb-1">
          NCAA Tournament Probabilities
        </h4>
        <table className="w-full text-sm">
          {tableHeader}
          <tbody>{renderMetricsRows(ncaaMetrics)}</tbody>
        </table>

        {/* NCAA Seed Distribution (no heading, small visual break) */}
        {(allNcaaSeeds.length > 0 || blBidPct > 0 || wiBidPct > 0) && (
          <div className="mt-3">
            <table className="w-full text-sm">
              {seedTableHeader}
              <tbody>
                {allNcaaSeeds.map((seed) => {
                  const cur = blDist[String(seed)] ?? 0;
                  const wi = wiDist[String(seed)] ?? 0;
                  const change = wi - cur;
                  if (cur === 0 && wi === 0) return null;
                  return (
                    <tr key={seed} className="border-b border-gray-100">
                      <td className="py-1.5 px-2">{seed}</td>
                      <td
                        className="text-center py-1.5 px-2 tabular-nums"
                        style={getCellColor(cur, "blue")}
                      >
                        {cur > 0 ? `${cur.toFixed(1)}%` : ""}
                      </td>
                      <td
                        className="text-center py-1.5 px-2 tabular-nums"
                        style={getCellColor(wi, "blue")}
                      >
                        {wi > 0 ? `${wi.toFixed(1)}%` : ""}
                      </td>
                      <td
                        className="text-center py-1.5 px-2 tabular-nums"
                        style={getDeltaColor(change, ncaaSeedMaxAbs)}
                      >
                        {Math.abs(change) < 0.05
                          ? "\u2014"
                          : change > 0
                            ? `+${change.toFixed(1)}%`
                            : `${change.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
                {/* Out of Tournament row */}
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 px-2 text-gray-500 italic text-xs">
                    Out
                  </td>
                  <td
                    className="text-center py-1.5 px-2 tabular-nums"
                    style={getCellColor(blOutPct, "yellow")}
                  >
                    {blOutPct > 0.05 ? `${blOutPct.toFixed(1)}%` : ""}
                  </td>
                  <td
                    className="text-center py-1.5 px-2 tabular-nums"
                    style={getCellColor(wiOutPct, "yellow")}
                  >
                    {wiOutPct > 0.05 ? `${wiOutPct.toFixed(1)}%` : ""}
                  </td>
                  <td
                    className="text-center py-1.5 px-2 tabular-nums"
                    style={getDeltaColor(outChange, ncaaSeedMaxAbs)}
                  >
                    {Math.abs(outChange) < 0.05
                      ? "\u2014"
                      : outChange > 0
                        ? `+${outChange.toFixed(1)}%`
                        : `${outChange.toFixed(1)}%`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Explainer text - data-no-screenshot prevents duplicate with screenshot's programmatic explainer */}
        <p
          className="text-[9px] text-gray-400 leading-relaxed mt-3 pt-2 border-t border-gray-100"
          data-no-screenshot
        >
          Shows how selected game outcomes affect this team&apos;s conference
          and NCAA tournament probabilities. Current reflects pre-selection
          probabilities; What If reflects updated probabilities after applying
          selected game results.
        </p>
      </div>
    </div>
  );
}
