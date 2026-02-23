// components/features/basketball/NextGameImpact.tsx
"use client";

import type { WhatIfGame, WhatIfTeamResult } from "@/hooks/useBasketballWhatIf";
import { getCellColor } from "@/lib/color-utils";
import { Camera, Loader } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const TEAL_COLOR = "rgb(0, 151, 178)";

interface NextGameMetrics {
  first_seed_pct: number;
  top4_pct: number;
  top8_pct: number;
  avg_seed: number;
  avg_conf_wins: number;
  num_teams: number;
  [key: `seed_${number}_pct`]: number;
  // NCAA tournament projection fields
  tournament_bid_pct?: number;
  average_seed?: number | null;
  ncaa_seed_distribution?: Record<string, number>;
}

interface NextGameImpactData {
  success: boolean;
  team_id: number;
  team_name: string;
  opponent_id: number;
  opponent_name: string;
  is_home: boolean;
  game: {
    game_id: number;
    date: string;
    home_team: string;
    away_team: string;
    home_team_id: number;
    away_team_id: number;
    home_team_logo: string;
    away_team_logo: string;
    home_probability: number | null;
    away_probability: number | null;
  } | null;
  current: Record<number, NextGameMetrics>;
  with_win: Record<number, NextGameMetrics>;
  with_loss: Record<number, NextGameMetrics>;
  calculation_time: number;
  error?: string;
}

function getLogoUrl(filename?: string): string | undefined {
  if (!filename) return undefined;
  if (filename.startsWith("http") || filename.startsWith("/")) return filename;
  return `/images/team_logos/${filename}`;
}

async function captureScreenshot(
  element: HTMLElement,
  filename: string,
  chartTitle?: string,
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
  titleSpan.textContent = chartTitle || "Next Game Impact";
  titleSpan.style.cssText =
    "font-size:13px;font-weight:500;color:#374151;text-align:center;flex:1;padding:0 12px;";
  const date = document.createElement("div");
  date.textContent = new Date().toLocaleDateString();
  date.style.cssText = "font-size:12px;color:#6b7280;";
  header.appendChild(logo);
  header.appendChild(titleSpan);
  header.appendChild(date);
  wrapper.appendChild(header);
  clone.style.cssText = "overflow:visible!important;width:100%!important;";
  wrapper.appendChild(clone);
  // Explainer text
  const explainer = document.createElement("div");
  explainer.style.cssText =
    "margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;line-height:1.4;";
  explainer.innerHTML =
    "Shows projected impact of the team's next scheduled conference game on seed probabilities. Win and Loss columns show how probabilities change if the team wins or loses that game.";
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

export default function NextGameImpact({
  conference,
  teams,
  games: _games,
  selectedTeamId,
  onTeamChange,
}: {
  conference: string | null;
  teams: WhatIfTeamResult[];
  games: WhatIfGame[];
  selectedTeamId: number | null;
  onTeamChange: (id: number | null) => void;
}) {
  const [impactData, setImpactData] = useState<NextGameImpactData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sort teams alphabetically for the dropdown (change 3)
  const sortedTeams = useMemo(
    () =>
      [...teams].sort((a, b) =>
        (a.team_name ?? "").localeCompare(b.team_name ?? ""),
      ),
    [teams],
  );

  // Reset data when conference changes
  useEffect(() => {
    setImpactData(null);
  }, [conference]);

  // Fetch impact data when team changes — cancels any in-flight request
  useEffect(() => {
    if (!selectedTeamId || !conference) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setFetchError(null);
    setImpactData(null);

    fetch("/api/proxy/basketball/whatif/next-game-impact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conference, team_id: selectedTeamId }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Impact fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data: NextGameImpactData) => {
        if (!controller.signal.aborted) {
          setImpactData(data);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        console.error("Next-game impact error:", e);
        setImpactData(null);
        setFetchError(e instanceof Error ? e.message : "Failed to load");
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [selectedTeamId, conference]);

  if (!conference || teams.length === 0) return null;

  const game = impactData?.game;
  const teamKey = selectedTeamId ? String(selectedTeamId) : null;
  const teamMetrics = teamKey
    ? ((impactData?.current as Record<string, NextGameMetrics>)?.[teamKey] ??
      null)
    : null;
  const winMetrics = teamKey
    ? ((impactData?.with_win as Record<string, NextGameMetrics>)?.[teamKey] ??
      null)
    : null;
  const lossMetrics = teamKey
    ? ((impactData?.with_loss as Record<string, NextGameMetrics>)?.[teamKey] ??
      null)
    : null;

  // Conference metrics
  const confMetrics: {
    label: string;
    key: keyof NextGameMetrics;
    isPercent: boolean;
  }[] = [
    { label: "#1 Seed Prob", key: "first_seed_pct", isPercent: true },
    { label: "Top 4 Seed Prob", key: "top4_pct", isPercent: true },
    { label: "Top 8 Seed Prob", key: "top8_pct", isPercent: true },
    { label: "Avg Seed", key: "avg_seed", isPercent: false },
    { label: "Proj Conf Wins", key: "avg_conf_wins", isPercent: false },
  ];

  // NCAA metrics
  const ncaaMetrics: {
    label: string;
    key: keyof NextGameMetrics;
    isPercent: boolean;
    hideIfZero?: boolean;
  }[] = [
    { label: "In Tourney Prob", key: "tournament_bid_pct", isPercent: true },
    {
      label: "Avg NCAA Seed",
      key: "average_seed",
      isPercent: false,
      hideIfZero: true,
    },
  ];

  const numTeams = teamMetrics?.num_teams ?? 16;

  return (
    <div className="bg-white rounded-lg shadow p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-medium">Team Detail</h3>
        <div className="flex items-center gap-2" data-no-screenshot>
          {game && teamMetrics && (
            <button
              onClick={async () => {
                if (!contentRef.current || capturing) return;
                setCapturing(true);
                try {
                  const team = sortedTeams.find(
                    (t) => t.team_id === selectedTeamId,
                  );
                  await captureScreenshot(
                    contentRef.current,
                    `next_game_impact_${(team?.team_name ?? "team").replace(/\s+/g, "_").toLowerCase()}.png`,
                    `Next Game Impact - ${team?.team_name ?? ""}`,
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
          )}
        </div>
      </div>

      {/* Shared team selector - controls both NGI and WhatIfTeamSummary */}
      <div className="mb-3" data-no-screenshot>
        <select
          value={selectedTeamId ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            onTeamChange(val ? parseInt(val) : null);
          }}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white text-xs hover:border-gray-400 transition-colors"
        >
          <option value="">Select Team</option>
          {sortedTeams.map((t) => (
            <option key={t.team_id} value={t.team_id}>
              {t.team_name}
            </option>
          ))}
        </select>
      </div>

      {/* Next Game Impact Content */}
      {!selectedTeamId ? (
        <p className="text-xs text-gray-400 italic py-2">
          Select a team to see next game impact and what-if summary
        </p>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div
            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: `${TEAL_COLOR} transparent transparent transparent`,
            }}
          />
          <span className="text-xs text-gray-400 ml-2">Calculating...</span>
        </div>
      ) : fetchError ? (
        <p className="text-xs text-red-400 italic py-2">{fetchError}</p>
      ) : impactData?.error ? (
        <p className="text-xs text-gray-400 italic py-2">{impactData.error}</p>
      ) : game && teamMetrics && winMetrics && lossMetrics ? (
        <div ref={contentRef}>
          <h4 className="text-sm font-medium mb-2">Next Game Impact</h4>
          {/* Matchup header */}
          <div className="flex items-center justify-center gap-2 mb-3 py-1.5 bg-gray-50 rounded">
            <div className="flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getLogoUrl(game.away_team_logo)}
                alt={game.away_team}
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-[11px] font-medium">{game.away_team}</span>
            </div>
            <span className="text-[10px] text-gray-400">@</span>
            <div className="flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getLogoUrl(game.home_team_logo)}
                alt={game.home_team}
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-[11px] font-medium">{game.home_team}</span>
            </div>
            <span className="text-[9px] text-gray-400 ml-1">{game.date}</span>
          </div>

          {/* ============================================================ */}
          {/* SECTION 1: Conference Tournament Probabilities               */}
          {/* ============================================================ */}
          <h4 className="text-sm font-semibold mb-1">
            Conference Tournament Probabilities
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th
                  className="text-left py-1.5 px-2 font-normal"
                  style={COL_METRIC}
                >
                  Metric
                </th>
                <th
                  className="text-center py-1.5 px-2 font-normal"
                  style={COL_DATA}
                >
                  Current
                </th>
                <th
                  className="text-center py-1.5 px-2 font-normal"
                  style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
                >
                  Win
                </th>
                <th
                  className="text-center py-1.5 px-2 font-normal"
                  style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}
                >
                  Loss
                </th>
              </tr>
            </thead>
            <tbody>
              {confMetrics.map(({ label, key, isPercent }) => {
                const cur = (teamMetrics[key] as number) ?? 0;
                const win = (winMetrics[key] as number) ?? 0;
                const loss = (lossMetrics[key] as number) ?? 0;
                return (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="py-1.5 px-2 text-sm">{label}</td>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={isPercent ? getCellColor(cur, "blue") : undefined}
                    >
                      {isPercent
                        ? cur > 0
                          ? `${cur.toFixed(1)}%`
                          : ""
                        : cur.toFixed(1)}
                    </td>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={isPercent ? getCellColor(win, "blue") : undefined}
                    >
                      {isPercent
                        ? win > 0
                          ? `${win.toFixed(1)}%`
                          : ""
                        : win.toFixed(1)}
                    </td>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={isPercent ? getCellColor(loss, "blue") : undefined}
                    >
                      {isPercent
                        ? loss > 0
                          ? `${loss.toFixed(1)}%`
                          : ""
                        : loss.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Conference Seed Distribution (no heading, small visual break) */}
          <div className="mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th
                    className="text-left py-1.5 px-2 font-normal"
                    style={COL_METRIC}
                  >
                    Seed
                  </th>
                  <th
                    className="text-center py-1.5 px-2 font-normal"
                    style={COL_DATA}
                  >
                    Current
                  </th>
                  <th
                    className="text-center py-1.5 px-2 font-normal"
                    style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
                  >
                    Win
                  </th>
                  <th
                    className="text-center py-1.5 px-2 font-normal"
                    style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}
                  >
                    Loss
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: numTeams }, (_, i) => {
                  const seed = i + 1;
                  const seedKey = `seed_${seed}_pct` as keyof NextGameMetrics;
                  const cur = (teamMetrics[seedKey] as number) ?? 0;
                  const win = (winMetrics[seedKey] as number) ?? 0;
                  const loss = (lossMetrics[seedKey] as number) ?? 0;
                  if (cur === 0 && win === 0 && loss === 0) return null;
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
                        style={getCellColor(win, "blue")}
                      >
                        {win > 0 ? `${win.toFixed(1)}%` : ""}
                      </td>
                      <td
                        className="text-center py-1.5 px-2 tabular-nums"
                        style={getCellColor(loss, "blue")}
                      >
                        {loss > 0 ? `${loss.toFixed(1)}%` : ""}
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
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th
                  className="text-left py-1.5 px-2 font-normal"
                  style={COL_METRIC}
                >
                  Metric
                </th>
                <th
                  className="text-center py-1.5 px-2 font-normal"
                  style={COL_DATA}
                >
                  Current
                </th>
                <th
                  className="text-center py-1.5 px-2 font-normal"
                  style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
                >
                  Win
                </th>
                <th
                  className="text-center py-1.5 px-2 font-normal"
                  style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}
                >
                  Loss
                </th>
              </tr>
            </thead>
            <tbody>
              {ncaaMetrics.map(({ label, key, isPercent, hideIfZero }) => {
                const cur = (teamMetrics[key] as number) ?? 0;
                const win = (winMetrics[key] as number) ?? 0;
                const loss = (lossMetrics[key] as number) ?? 0;
                const curNull =
                  teamMetrics[key] == null || (hideIfZero && cur === 0);
                const winNull =
                  winMetrics[key] == null || (hideIfZero && win === 0);
                const lossNull =
                  lossMetrics[key] == null || (hideIfZero && loss === 0);
                return (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="py-1.5 px-2 text-sm">{label}</td>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={isPercent ? getCellColor(cur, "blue") : undefined}
                    >
                      {curNull
                        ? "\u2014"
                        : isPercent
                          ? cur > 0
                            ? `${cur.toFixed(1)}%`
                            : ""
                          : cur.toFixed(1)}
                    </td>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={isPercent ? getCellColor(win, "blue") : undefined}
                    >
                      {winNull
                        ? "\u2014"
                        : isPercent
                          ? win > 0
                            ? `${win.toFixed(1)}%`
                            : ""
                          : win.toFixed(1)}
                    </td>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={isPercent ? getCellColor(loss, "blue") : undefined}
                    >
                      {lossNull
                        ? "\u2014"
                        : isPercent
                          ? loss > 0
                            ? `${loss.toFixed(1)}%`
                            : ""
                          : loss.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* NCAA Seed Distribution (no heading, small visual break) */}
          {(() => {
            const curDist =
              (teamMetrics.ncaa_seed_distribution as
                | Record<string, number>
                | undefined) ?? {};
            const winDist =
              (winMetrics.ncaa_seed_distribution as
                | Record<string, number>
                | undefined) ?? {};
            const lossDist =
              (lossMetrics.ncaa_seed_distribution as
                | Record<string, number>
                | undefined) ?? {};
            const curBid = (teamMetrics.tournament_bid_pct as number) ?? 0;
            const winBid = (winMetrics.tournament_bid_pct as number) ?? 0;
            const lossBid = (lossMetrics.tournament_bid_pct as number) ?? 0;
            const allSeeds = Array.from(
              new Set([
                ...Object.keys(curDist),
                ...Object.keys(winDist),
                ...Object.keys(lossDist),
              ]),
            )
              .map(Number)
              .filter((n) => !isNaN(n))
              .sort((a, b) => a - b);

            if (
              allSeeds.length === 0 &&
              curBid === 0 &&
              winBid === 0 &&
              lossBid === 0
            )
              return null;

            const curOut = 100 - curBid;
            const winOut = 100 - winBid;
            const lossOut = 100 - lossBid;

            return (
              <div className="mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th
                        className="text-left py-1.5 px-2 font-normal"
                        style={COL_METRIC}
                      >
                        Seed
                      </th>
                      <th
                        className="text-center py-1.5 px-2 font-normal"
                        style={COL_DATA}
                      >
                        Current
                      </th>
                      <th
                        className="text-center py-1.5 px-2 font-normal"
                        style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
                      >
                        Win
                      </th>
                      <th
                        className="text-center py-1.5 px-2 font-normal"
                        style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}
                      >
                        Loss
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSeeds.map((seed) => {
                      const c = curDist[String(seed)] ?? 0;
                      const w = winDist[String(seed)] ?? 0;
                      const l = lossDist[String(seed)] ?? 0;
                      if (c === 0 && w === 0 && l === 0) return null;
                      return (
                        <tr key={seed} className="border-b border-gray-100">
                          <td className="py-1.5 px-2">{seed}</td>
                          <td
                            className="text-center py-1.5 px-2 tabular-nums"
                            style={getCellColor(c, "blue")}
                          >
                            {c > 0 ? `${c.toFixed(1)}%` : ""}
                          </td>
                          <td
                            className="text-center py-1.5 px-2 tabular-nums"
                            style={getCellColor(w, "blue")}
                          >
                            {w > 0 ? `${w.toFixed(1)}%` : ""}
                          </td>
                          <td
                            className="text-center py-1.5 px-2 tabular-nums"
                            style={getCellColor(l, "blue")}
                          >
                            {l > 0 ? `${l.toFixed(1)}%` : ""}
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
                        style={getCellColor(curOut, "yellow")}
                      >
                        {curOut > 0.05 ? `${curOut.toFixed(1)}%` : ""}
                      </td>
                      <td
                        className="text-center py-1.5 px-2 tabular-nums"
                        style={getCellColor(winOut, "yellow")}
                      >
                        {winOut > 0.05 ? `${winOut.toFixed(1)}%` : ""}
                      </td>
                      <td
                        className="text-center py-1.5 px-2 tabular-nums"
                        style={getCellColor(lossOut, "yellow")}
                      >
                        {lossOut > 0.05 ? `${lossOut.toFixed(1)}%` : ""}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Explainer text - data-no-screenshot prevents duplicate with screenshot's programmatic explainer */}
          <p
            className="text-[9px] text-gray-400 leading-relaxed mt-3 pt-2 border-t border-gray-100"
            data-no-screenshot
          >
            Shows projected impact of the team&apos;s next scheduled conference
            game on conference and NCAA tournament probabilities. Win and Loss
            columns show how probabilities change if the team wins or loses that
            game.
          </p>
        </div>
      ) : null}
    </div>
  );
}
