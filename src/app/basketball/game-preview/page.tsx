// src/app/basketball/game-preview/page.tsx
"use client";

import BasketballTeamWinsBreakdown from "@/components/features/basketball/BasketballTeamWinsBreakdown";
import TeamSeedProjections from "@/components/features/basketball/TeamSeedProjections";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { getCellColor } from "@/lib/color-utils";
import { api } from "@/services/api";
import { Download, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TeamGameData {
  date: string;
  opponent: string;
  opponent_logo?: string;
  opponent_primary_color?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  kenpom_rank?: number;
  team_win_prob?: number;
  kenpom_win_prob?: number;
  team_points?: number;
  opp_points?: number;
  team_conf?: string;
}

interface WinSeedCountEntry {
  Wins: number;
  Seed?: string;
  Tournament_Status?: string;
  Count: number;
  Auto_Bid_Pct?: number;
  At_Large_Pct?: number;
}

interface TeamInfo {
  team_name: string;
  team_id: string;
  conference: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  overall_record: string;
  conference_record: string;
  tournament_bid_pct?: number;
  average_seed?: number;
  kenpom_rank?: number;
  win_seed_counts: WinSeedCountEntry[];
}

interface TeamDataResponse {
  team_info: TeamInfo;
  schedule: TeamGameData[];
  all_schedule_data?: unknown[];
}

interface UpcomingGame {
  date: string;
  date_sort: string;
  home_team: string;
  away_team: string;
  home_team_logo: string;
  away_team_logo: string;
  home_team_conference: string;
  away_team_conference: string;
  home_team_color: string;
  away_team_color: string;
  is_conference_game: boolean;
  location: string;
  win_prob: number | null;
  label: string;
}

interface ComputedMetrics {
  overallRecord: string;
  conferenceRecord: string;
  kenpomRank: number | null;
  currentStreak: string;
  last5: string;
  last10: string;
}

interface NextGameMetrics {
  first_seed_pct: number;
  top4_pct: number;
  top8_pct: number;
  avg_seed: number;
  avg_conf_wins: number;
  num_teams: number;
  [key: `seed_${number}_pct`]: number;
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

// ─── Utility Functions ───────────────────────────────────────────────────────

function computeMetrics(
  schedule: TeamGameData[],
  teamInfo: TeamInfo,
): ComputedMetrics {
  const completedGames = schedule.filter(
    (g) => g.status === "W" || g.status === "L",
  );
  let streakCount = 0;
  let streakType = "";
  for (let i = completedGames.length - 1; i >= 0; i--) {
    const s = completedGames[i].status;
    if (streakType === "") {
      streakType = s;
      streakCount = 1;
    } else if (s === streakType) {
      streakCount++;
    } else {
      break;
    }
  }
  const currentStreak = streakCount > 0 ? `${streakType}${streakCount}` : "N/A";
  const lastN = (n: number) => {
    const recent = completedGames.slice(-n);
    const wins = recent.filter((g) => g.status === "W").length;
    const losses = recent.filter((g) => g.status === "L").length;
    return `${wins}-${losses}`;
  };
  return {
    overallRecord: teamInfo.overall_record || "0-0",
    conferenceRecord: teamInfo.conference_record || "0-0",
    kenpomRank: teamInfo.kenpom_rank || null,
    currentStreak,
    last5: lastN(5),
    last10: lastN(10),
  };
}

function buildTeamNarrative(
  teamName: string,
  metrics: ComputedMetrics,
  teamInfo: TeamInfo,
): string {
  const [overallW, overallL] = metrics.overallRecord.split("-").map(Number);
  const [confW, confL] = metrics.conferenceRecord.split("-").map(Number);
  let streakDesc = "";
  if (metrics.currentStreak.startsWith("W")) {
    const n = parseInt(metrics.currentStreak.slice(1));
    streakDesc =
      n >= 5
        ? `on a blazing ${n}-game win streak`
        : n >= 3
          ? `riding a ${n}-game win streak`
          : `winners of their last ${n}`;
  } else if (metrics.currentStreak.startsWith("L")) {
    const n = parseInt(metrics.currentStreak.slice(1));
    streakDesc =
      n >= 5
        ? `struggling through a ${n}-game losing skid`
        : n >= 3
          ? `mired in a ${n}-game losing streak`
          : `coming off ${n} straight loss${n > 1 ? "es" : ""}`;
  }
  const [l5w] = metrics.last5.split("-").map(Number);
  let recentForm = "";
  if (l5w >= 4) recentForm = "playing excellent basketball recently";
  else if (l5w >= 3) recentForm = "solid in their recent stretch";
  else if (l5w <= 1) recentForm = "struggling to find wins lately";
  let ratingDesc = "";
  if (metrics.kenpomRank) {
    if (metrics.kenpomRank <= 10)
      ratingDesc = `an elite team ranked #${metrics.kenpomRank} in KenPom`;
    else if (metrics.kenpomRank <= 25)
      ratingDesc = `a top-25 KenPom team at #${metrics.kenpomRank}`;
    else if (metrics.kenpomRank <= 50)
      ratingDesc = `ranked #${metrics.kenpomRank} in KenPom`;
    else ratingDesc = `sitting at #${metrics.kenpomRank} in KenPom`;
  }
  let tourneyDesc = "";
  if (teamInfo.tournament_bid_pct !== undefined) {
    const bidPct = teamInfo.tournament_bid_pct;
    if (bidPct >= 95) tourneyDesc = "a virtual lock for the NCAA Tournament";
    else if (bidPct >= 75)
      tourneyDesc = `in strong position for a tournament bid (${bidPct.toFixed(0)}%)`;
    else if (bidPct >= 50)
      tourneyDesc = `on the bubble with a ${bidPct.toFixed(0)}% chance at a tournament bid`;
    else if (bidPct >= 25)
      tourneyDesc = `facing an uphill battle for a tournament bid (${bidPct.toFixed(0)}%)`;
    else if (bidPct > 0)
      tourneyDesc = `a long shot for the tournament at ${bidPct.toFixed(0)}%`;
  }
  const parts: string[] = [];
  parts.push(
    `${teamName} enters this game at ${overallW}-${overallL} overall and ${confW}-${confL} in conference play.`,
  );
  if (ratingDesc) parts.push(`They are ${ratingDesc}.`);
  if (streakDesc) parts.push(`The team is ${streakDesc}.`);
  if (recentForm)
    parts.push(
      `They've gone ${metrics.last5} over their last 5 and ${metrics.last10} over their last 10, ${recentForm}.`,
    );
  if (tourneyDesc) parts.push(`They are currently ${tourneyDesc}.`);
  if (teamInfo.average_seed)
    parts.push(
      `Their projected average seed is ${teamInfo.average_seed.toFixed(1)}.`,
    );
  return parts.join(" ");
}

function getLogoUrl(filename?: string): string | undefined {
  if (!filename) return undefined;
  if (filename.startsWith("http") || filename.startsWith("/")) return filename;
  return `/images/team_logos/${filename}`;
}
// ─── Next Game Impact Inline Component ───────────────────────────────────────

function NextGameImpactInline({
  teamId,
  conference,
}: {
  teamId: string;
  conference: string;
}) {
  const [impactData, setImpactData] = useState<NextGameImpactData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || !conference) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setImpactData(null);

    fetch("/api/proxy/basketball/whatif/next-game-impact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conference, team_id: parseInt(teamId) }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
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
        setError(e instanceof Error ? e.message : "Failed");
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [teamId, conference]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div
          className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
          style={{
            borderColor: "rgb(0, 151, 178) transparent transparent transparent",
          }}
        />
        <span className="text-xs text-gray-400 ml-2">
          Calculating impact...
        </span>
      </div>
    );
  }
  if (error || impactData?.error || !impactData?.game) return null;

  const game = impactData.game;
  const teamKey = String(impactData.team_id);
  const teamMetrics =
    (impactData.current as Record<string, NextGameMetrics>)?.[teamKey] ?? null;
  const winMetrics =
    (impactData.with_win as Record<string, NextGameMetrics>)?.[teamKey] ?? null;
  const lossMetrics =
    (impactData.with_loss as Record<string, NextGameMetrics>)?.[teamKey] ??
    null;
  if (!teamMetrics || !winMetrics || !lossMetrics) return null;

  const numTeams = teamMetrics.num_teams ?? 16;
  const COL_METRIC = { minWidth: "100px" };
  const COL_DATA = { minWidth: "55px", width: "55px" };
  const summaryMetrics: {
    label: string;
    key: keyof NextGameMetrics;
    isPercent: boolean;
  }[] = [
    { label: "#1 Seed %", key: "first_seed_pct", isPercent: true },
    { label: "Top 4 %", key: "top4_pct", isPercent: true },
    { label: "Top 8 %", key: "top8_pct", isPercent: true },
    { label: "Avg Seed", key: "avg_seed", isPercent: false },
    { label: "Proj Conf Wins", key: "avg_conf_wins", isPercent: false },
  ];

  return (
    <div>
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
      {/* Summary Metrics */}
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
          {summaryMetrics.map(({ label, key, isPercent }) => {
            const cur = teamMetrics[key] as number;
            const win = winMetrics[key] as number;
            const loss = lossMetrics[key] as number;
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
                    : cur.toFixed(2)}
                </td>
                <td
                  className="text-center py-1.5 px-2 tabular-nums"
                  style={isPercent ? getCellColor(win, "blue") : undefined}
                >
                  {isPercent
                    ? win > 0
                      ? `${win.toFixed(1)}%`
                      : ""
                    : win.toFixed(2)}
                </td>
                <td
                  className="text-center py-1.5 px-2 tabular-nums"
                  style={isPercent ? getCellColor(loss, "blue") : undefined}
                >
                  {isPercent
                    ? loss > 0
                      ? `${loss.toFixed(1)}%`
                      : ""
                    : loss.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Seed Distribution */}
      <div className="mt-3">
        <h4 className="text-sm font-medium mb-2">Seed Probabilities</h4>
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
    </div>
  );
}

// ─── Head-to-Head Comparison ─────────────────────────────────────────────────

function HeadToHeadComparison({
  awayTeam,
  homeTeam,
  awayMetrics,
  homeMetrics,
  awayInfo,
  homeInfo,
}: {
  awayTeam: string;
  homeTeam: string;
  awayMetrics: ComputedMetrics;
  homeMetrics: ComputedMetrics;
  awayInfo: TeamInfo;
  homeInfo: TeamInfo;
}) {
  const metrics: {
    label: string;
    awayValue: string;
    homeValue: string;
    isStreak?: boolean;
  }[] = [
    {
      label: "Record",
      awayValue: awayMetrics.overallRecord,
      homeValue: homeMetrics.overallRecord,
    },
    {
      label: "Conf. Record",
      awayValue: awayMetrics.conferenceRecord,
      homeValue: homeMetrics.conferenceRecord,
    },
    {
      label: "KenPom Rating",
      awayValue: awayMetrics.kenpomRank ? `#${awayMetrics.kenpomRank}` : "N/A",
      homeValue: homeMetrics.kenpomRank ? `#${homeMetrics.kenpomRank}` : "N/A",
    },
    {
      label: "Current Streak",
      awayValue: awayMetrics.currentStreak,
      homeValue: homeMetrics.currentStreak,
      isStreak: true,
    },
    {
      label: "Last 5",
      awayValue: awayMetrics.last5,
      homeValue: homeMetrics.last5,
    },
    {
      label: "Last 10",
      awayValue: awayMetrics.last10,
      homeValue: homeMetrics.last10,
    },
  ];
  const streakColor = (val: string) => {
    if (val.startsWith("W")) return "#16a34a";
    if (val.startsWith("L")) return "#dc2626";
    return "#374151";
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          borderBottom: "2px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "16px 8px",
            gap: 4,
            backgroundColor: awayInfo.primary_color
              ? `${awayInfo.primary_color}0D`
              : "#f9fafb",
          }}
        >
          <TeamLogo logoUrl={awayInfo.logo_url} teamName={awayTeam} size={52} />
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#1f2937",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {awayTeam}
          </span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {awayInfo.conference}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 16px",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "#9ca3af",
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            @
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "16px 8px",
            gap: 4,
            backgroundColor: homeInfo.primary_color
              ? `${homeInfo.primary_color}0D`
              : "#f9fafb",
          }}
        >
          <TeamLogo logoUrl={homeInfo.logo_url} teamName={homeTeam} size={52} />
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#1f2937",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {homeTeam}
          </span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {homeInfo.conference}
          </span>
        </div>
      </div>
      {metrics.map((m, idx) => (
        <div
          key={m.label}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            borderBottom:
              idx < metrics.length - 1 ? "1px solid #f3f4f6" : "none",
            backgroundColor: idx % 2 === 0 ? "white" : "#fafbfc",
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "10px 8px",
              fontWeight: 600,
              fontSize: 14,
              color: m.isStreak ? streakColor(m.awayValue) : "#1f2937",
            }}
          >
            {m.awayValue}
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "10px 12px",
              fontSize: 12,
              color: "#6b7280",
              fontWeight: 500,
              minWidth: 120,
              borderLeft: "1px solid #f3f4f6",
              borderRight: "1px solid #f3f4f6",
            }}
          >
            {m.label}
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "10px 8px",
              fontWeight: 600,
              fontSize: 14,
              color: m.isStreak ? streakColor(m.homeValue) : "#1f2937",
            }}
          >
            {m.homeValue}
          </div>
        </div>
      ))}
    </div>
  );
}
// ─── PDF Generation ──────────────────────────────────────────────────────────

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: object,
    ) => Promise<HTMLCanvasElement>;
  }
}

async function generatePDF(
  previewRef: React.RefObject<HTMLDivElement | null>,
  gameName: string,
) {
  if (!previewRef.current) return;
  if (typeof window !== "undefined" && !window.html2canvas) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed"));
      document.body.appendChild(s);
    });
  }
  const html2canvas = window.html2canvas;
  if (!html2canvas) return;
  if (!(window as unknown as Record<string, unknown>).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed"));
      document.body.appendChild(s);
    });
  }
  interface JsPDFInstance {
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
    addImage: (
      data: string,
      format: string,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => void;
    save: (filename: string) => void;
  }
  const jspdfModule = (window as unknown as Record<string, unknown>).jspdf as {
    jsPDF: new (options: {
      orientation: string;
      unit: string;
      format: string;
    }) => JsPDFInstance;
  };
  if (!jspdfModule) return;
  const element = previewRef.current;
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: Math.max(element.scrollWidth, 860),
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jspdfModule.jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const imgRatio = canvas.height / canvas.width;
  const scaledHeight = usableWidth * imgRatio;
  if (scaledHeight <= usableHeight) {
    pdf.addImage(imgData, "PNG", margin, margin, usableWidth, scaledHeight);
  } else {
    const fitWidth = usableHeight / imgRatio;
    const xOffset = margin + (usableWidth - fitWidth) / 2;
    pdf.addImage(imgData, "PNG", xOffset, margin, fitWidth, usableHeight);
  }
  const safeName = gameName
    .replace(/[^a-zA-Z0-9\-_ ]/g, "")
    .replace(/\s+/g, "_");
  pdf.save(`Game_Preview_${safeName}.pdf`);
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function GamePreviewPage() {
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>([]);
  const [conferences, setConferences] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<UpcomingGame | null>(null);
  const [conferenceFilter, setConferenceFilter] = useState<string>("All");
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [awayTeamData, setAwayTeamData] = useState<TeamDataResponse | null>(
    null,
  );
  const [homeTeamData, setHomeTeamData] = useState<TeamDataResponse | null>(
    null,
  );
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadGames = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/proxy/basketball/upcoming_games");
        if (!response.ok) throw new Error("Failed to fetch upcoming games");
        const data = await response.json();
        setUpcomingGames(data.games || []);
        setConferences(data.conferences || []);
      } catch (err) {
        console.error("Failed to load upcoming games:", err);
        setError("Failed to load upcoming games. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, []);

  useEffect(() => {
    if (!selectedGame) {
      setAwayTeamData(null);
      setHomeTeamData(null);
      return;
    }
    const loadPreview = async () => {
      setIsLoadingPreview(true);
      setError(null);
      try {
        const [awayResp, homeResp] = await Promise.all([
          api.getTeamData(selectedGame.away_team),
          api.getTeamData(selectedGame.home_team),
        ]);
        setAwayTeamData(awayResp as unknown as TeamDataResponse);
        setHomeTeamData(homeResp as unknown as TeamDataResponse);
      } catch {
        setError("Failed to load team preview data.");
      } finally {
        setIsLoadingPreview(false);
      }
    };
    loadPreview();
  }, [selectedGame]);

  const filteredGames = useMemo(() => {
    let games = upcomingGames;
    if (conferenceFilter !== "All")
      games = games.filter(
        (g) =>
          g.home_team_conference === conferenceFilter ||
          g.away_team_conference === conferenceFilter,
      );
    if (teamFilter.trim()) {
      const search = teamFilter.toLowerCase().trim();
      games = games.filter(
        (g) =>
          g.home_team.toLowerCase().includes(search) ||
          g.away_team.toLowerCase().includes(search),
      );
    }
    return games;
  }, [upcomingGames, conferenceFilter, teamFilter]);

  const availableConferences = useMemo(
    () => ["All", ...conferences.filter((c) => c && c !== "FCS")],
    [conferences],
  );
  const awayMetrics = useMemo(
    () =>
      awayTeamData
        ? computeMetrics(awayTeamData.schedule, awayTeamData.team_info)
        : null,
    [awayTeamData],
  );
  const homeMetrics = useMemo(
    () =>
      homeTeamData
        ? computeMetrics(homeTeamData.schedule, homeTeamData.team_info)
        : null,
    [homeTeamData],
  );
  const handlePDF = useCallback(async () => {
    if (!selectedGame) return;
    setIsPdfGenerating(true);
    try {
      await generatePDF(previewRef, selectedGame.label);
    } finally {
      setIsPdfGenerating(false);
    }
  }, [selectedGame]);
  const gameKey = (g: UpcomingGame) =>
    `${g.away_team}@${g.home_team}-${g.date_sort}`;

  return (
    <PageLayoutWrapper title="Game Preview" isLoading={isLoading}>
      <ErrorBoundary>
        <div style={{ maxWidth: 960 }}>
          <p className="text-sm text-gray-500 mb-5">
            Select an upcoming game to view a head-to-head comparison and
            tournament seed projections.
          </p>

          {error && upcomingGames.length === 0 ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : (
            <>
              {/* Filters */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 12,
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 3 }}
                >
                  <label
                    style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}
                  >
                    Conference
                  </label>
                  <select
                    value={conferenceFilter}
                    onChange={(e) => setConferenceFilter(e.target.value)}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: 13,
                      minWidth: 160,
                      backgroundColor: "white",
                    }}
                  >
                    {availableConferences.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    flex: 1,
                    minWidth: 180,
                  }}
                >
                  <label
                    style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}
                  >
                    Search Team
                  </label>
                  <div style={{ position: "relative" }}>
                    <Search
                      size={14}
                      style={{
                        position: "absolute",
                        left: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#9ca3af",
                      }}
                    />
                    <input
                      type="text"
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                      placeholder="Filter by team name..."
                      style={{
                        padding: "6px 10px 6px 28px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: 13,
                        width: "100%",
                        backgroundColor: "white",
                      }}
                    />
                    {teamFilter && (
                      <button
                        onClick={() => setTeamFilter("")}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#9ca3af",
                          padding: 0,
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Game Selector */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    fontWeight: 500,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Select Game ({filteredGames.length} upcoming games)
                </label>
                <select
                  value={selectedGame ? gameKey(selectedGame) : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setSelectedGame(null);
                      return;
                    }
                    setSelectedGame(
                      filteredGames.find((g) => gameKey(g) === val) || null,
                    );
                  }}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 13,
                    width: "100%",
                    backgroundColor: "white",
                    cursor: "pointer",
                  }}
                >
                  <option value="">— Choose an upcoming game —</option>
                  {filteredGames.map((g) => (
                    <option key={gameKey(g)} value={gameKey(g)}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Game Preview Content */}
              {selectedGame && (
                <>
                  {isLoadingPreview ? (
                    <div className="py-12">
                      <LoadingSpinner />
                    </div>
                  ) : awayTeamData &&
                    homeTeamData &&
                    awayMetrics &&
                    homeMetrics ? (
                    <>
                      {/* PDF Download */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginBottom: 12,
                        }}
                      >
                        <button
                          onClick={handlePDF}
                          disabled={isPdfGenerating}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 14px",
                            backgroundColor: isPdfGenerating
                              ? "#9ca3af"
                              : "#18627b",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: isPdfGenerating ? "not-allowed" : "pointer",
                          }}
                        >
                          <Download size={14} />
                          {isPdfGenerating ? "Generating..." : "Download PDF"}
                        </button>
                      </div>

                      {/* Printable Preview Area */}
                      <div
                        ref={previewRef}
                        style={{ backgroundColor: "white", padding: 20 }}
                      >
                        {/* Header Banner */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 16,
                            paddingBottom: 10,
                            borderBottom: "2px solid #e5e7eb",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <div>
                            <img
                              src="/images/JThom_Logo.png"
                              alt="Logo"
                              style={{ height: 30 }}
                            />
                          </div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: "#1f2937",
                              textAlign: "center",
                              flex: 1,
                              padding: "0 12px",
                            }}
                          >
                            Game Preview — {selectedGame.date}
                          </div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            {new Date().toLocaleDateString()}
                          </div>
                        </div>

                        {/* 1. Head-to-Head Comparison */}
                        <HeadToHeadComparison
                          awayTeam={selectedGame.away_team}
                          homeTeam={selectedGame.home_team}
                          awayMetrics={awayMetrics}
                          homeMetrics={homeMetrics}
                          awayInfo={awayTeamData.team_info}
                          homeInfo={homeTeamData.team_info}
                        />

                        {/* 2. Team Narrative Summaries */}
                        <div
                          style={{
                            marginTop: 20,
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 16,
                          }}
                        >
                          <div
                            style={{
                              padding: 12,
                              backgroundColor: "#f9fafb",
                              borderRadius: 8,
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 8,
                              }}
                            >
                              <TeamLogo
                                logoUrl={awayTeamData.team_info.logo_url}
                                teamName={selectedGame.away_team}
                                size={20}
                              />
                              <span
                                style={{
                                  fontWeight: 600,
                                  fontSize: 13,
                                  color: "#374151",
                                }}
                              >
                                {selectedGame.away_team}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: 12,
                                color: "#4b5563",
                                lineHeight: 1.6,
                                margin: 0,
                              }}
                            >
                              {buildTeamNarrative(
                                selectedGame.away_team,
                                awayMetrics,
                                awayTeamData.team_info,
                              )}
                            </p>
                          </div>
                          <div
                            style={{
                              padding: 12,
                              backgroundColor: "#f9fafb",
                              borderRadius: 8,
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 8,
                              }}
                            >
                              <TeamLogo
                                logoUrl={homeTeamData.team_info.logo_url}
                                teamName={selectedGame.home_team}
                                size={20}
                              />
                              <span
                                style={{
                                  fontWeight: 600,
                                  fontSize: 13,
                                  color: "#374151",
                                }}
                              >
                                {selectedGame.home_team}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: 12,
                                color: "#4b5563",
                                lineHeight: 1.6,
                                margin: 0,
                              }}
                            >
                              {buildTeamNarrative(
                                selectedGame.home_team,
                                homeMetrics,
                                homeTeamData.team_info,
                              )}
                            </p>
                          </div>
                        </div>

                        {/* 3. Next Game Win/Loss Impact */}
                        <div style={{ marginTop: 24 }}>
                          <h3
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#374151",
                              marginBottom: 12,
                              paddingBottom: 6,
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Next Game Win/Loss Impact
                          </h3>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 16,
                            }}
                          >
                            <div
                              style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                padding: 12,
                                backgroundColor: "white",
                              }}
                            >
                              <NextGameImpactInline
                                teamId={awayTeamData.team_info.team_id}
                                conference={awayTeamData.team_info.conference}
                              />
                            </div>
                            <div
                              style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                padding: 12,
                                backgroundColor: "white",
                              }}
                            >
                              <NextGameImpactInline
                                teamId={homeTeamData.team_info.team_id}
                                conference={homeTeamData.team_info.conference}
                              />
                            </div>
                          </div>
                        </div>

                        {/* 4. Tournament Seed Projections (Wins to Seed Map) */}
                        <div style={{ marginTop: 24 }}>
                          <h3
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#374151",
                              marginBottom: 12,
                              paddingBottom: 6,
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Wins to Seed Map
                          </h3>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 16,
                            }}
                          >
                            <div>
                              <TeamSeedProjections
                                winSeedCounts={
                                  awayTeamData.team_info.win_seed_counts || []
                                }
                                logoUrl={awayTeamData.team_info.logo_url}
                              />
                            </div>
                            <div>
                              <TeamSeedProjections
                                winSeedCounts={
                                  homeTeamData.team_info.win_seed_counts || []
                                }
                                logoUrl={homeTeamData.team_info.logo_url}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 5. Wins Breakdown Charts (outside PDF area - interactive charts) */}
                      <div style={{ marginTop: 24 }}>
                        <h3
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#374151",
                            marginBottom: 12,
                            paddingBottom: 6,
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          Season Wins Breakdown
                        </h3>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 16,
                          }}
                        >
                          <BasketballTeamWinsBreakdown
                            schedule={awayTeamData.schedule}
                            teamName={selectedGame.away_team}
                            conference={awayTeamData.team_info.conference}
                            primaryColor={
                              awayTeamData.team_info.primary_color || "#18627b"
                            }
                            secondaryColor={
                              awayTeamData.team_info.secondary_color
                            }
                            logoUrl={awayTeamData.team_info.logo_url}
                          />
                          <BasketballTeamWinsBreakdown
                            schedule={homeTeamData.schedule}
                            teamName={selectedGame.home_team}
                            conference={homeTeamData.team_info.conference}
                            primaryColor={
                              homeTeamData.team_info.primary_color || "#18627b"
                            }
                            secondaryColor={
                              homeTeamData.team_info.secondary_color
                            }
                            logoUrl={homeTeamData.team_info.logo_url}
                          />
                        </div>
                      </div>
                    </>
                  ) : error ? (
                    <div className="text-center py-8 text-red-500 text-sm">
                      {error}
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
