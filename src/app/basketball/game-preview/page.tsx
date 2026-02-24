// src/app/basketball/game-preview/page.tsx
"use client";

import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import TeamLogo from "@/components/ui/TeamLogo";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import BasketballTeamWinsBreakdown from "@/components/features/basketball/BasketballTeamWinsBreakdown";
import BasketballTeamScheduleDifficulty from "@/components/features/basketball/BasketballTeamScheduleDifficulty";
import TeamWinValues from "@/components/features/basketball/TeamWinValues";
import { api } from "@/services/api";
import { getCellColor } from "@/lib/color-utils";
import { Download, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Responsive Hook (inline) ────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

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
  current_conf_standing?: number;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  kenpom_win_prob: number;
  team_conf: string;
  team_conf_catg?: string;
  status: string;
}

interface TeamDataResponse {
  team_info: TeamInfo;
  schedule: TeamGameData[];
  all_schedule_data?: AllScheduleGame[];
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
  homeRecord: string;
  awayRecord: string;
  neutralRecord: string;
  currentConfStanding: number | null;
  confPosition: string;
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

interface ConferenceStandingsTeam {
  team_name: string;
  teamid: number;
  conference_record: string;
  conf_wins: number;
  conf_losses: number;
}

const TEAL = "#0097b2";

// ─── Utility Functions ───────────────────────────────────────────────────────

function computeMetrics(schedule: TeamGameData[], teamInfo: TeamInfo, confPosition: string): ComputedMetrics {
  const completedGames = schedule.filter((g) => g.status === "W" || g.status === "L");
  let streakCount = 0;
  let streakType = "";
  for (let i = completedGames.length - 1; i >= 0; i--) {
    const s = completedGames[i].status;
    if (streakType === "") { streakType = s; streakCount = 1; }
    else if (s === streakType) { streakCount++; }
    else { break; }
  }
  const currentStreak = streakCount > 0 ? `${streakType}${streakCount}` : "N/A";
  const lastN = (n: number) => {
    const recent = completedGames.slice(-n);
    return `${recent.filter((g) => g.status === "W").length}-${recent.filter((g) => g.status === "L").length}`;
  };
  const byLoc = (loc: string) => {
    const g = completedGames.filter((x) => x.location === loc);
    return `${g.filter((x) => x.status === "W").length}-${g.filter((x) => x.status === "L").length}`;
  };
  return {
    overallRecord: teamInfo.overall_record || "0-0",
    conferenceRecord: teamInfo.conference_record || "0-0",
    kenpomRank: teamInfo.kenpom_rank || null,
    currentStreak,
    last5: lastN(5),
    last10: lastN(10),
    homeRecord: byLoc("Home"),
    awayRecord: byLoc("Away"),
    neutralRecord: byLoc("Neutral"),
    currentConfStanding: teamInfo.current_conf_standing || null,
    confPosition,
  };
}

function getGameDifficultyRank(schedule: TeamGameData[], opponentName: string, gameDate: string, locationFilter?: string): number | null {
  let games = schedule;
  if (locationFilter) games = games.filter((g) => g.location === locationFilter);
  const withProb = games
    .filter((g) => g.team_win_prob !== undefined && g.team_win_prob !== null)
    .sort((a, b) => (a.team_win_prob ?? 1) - (b.team_win_prob ?? 1));
  const idx = withProb.findIndex((g) => g.opponent === opponentName && g.date === gameDate);
  return idx >= 0 ? idx + 1 : null;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getLogoUrl(filename?: string): string | undefined {
  if (!filename) return undefined;
  if (filename.startsWith("http") || filename.startsWith("/")) return filename;
  return `/images/team_logos/${filename}`;
}

/** Compute conference position with ties from standings data */
function computeConfPosition(teamName: string, standings: ConferenceStandingsTeam[]): string {
  if (!standings.length) return "—";
  // Sort by conf_wins DESC, then conf_losses ASC
  const sorted = [...standings].sort((a, b) => {
    if (b.conf_wins !== a.conf_wins) return b.conf_wins - a.conf_wins;
    return a.conf_losses - b.conf_losses;
  });
  // Assign positions with ties
  let position = 1;
  let prevWins = -1;
  let prevLosses = -1;
  const positionMap = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].conf_wins !== prevWins || sorted[i].conf_losses !== prevLosses) {
      position = i + 1;
    }
    positionMap.set(sorted[i].team_name, position);
    prevWins = sorted[i].conf_wins;
    prevLosses = sorted[i].conf_losses;
  }
  const pos = positionMap.get(teamName);
  if (!pos) return "—";
  // Check if tied
  const samePos = sorted.filter((t) => positionMap.get(t.team_name) === pos);
  if (samePos.length > 1) return `T-${ordinal(pos)}`;
  return ordinal(pos);
}

/** Fetch conference standings for position calculation */
async function fetchConferenceStandings(conference: string): Promise<ConferenceStandingsTeam[]> {
  try {
    const confFormatted = conference.replace(/ /g, "_");
    const response = await fetch(`/api/proxy/standings/${confFormatted}`);
    if (!response.ok) return [];
    const json = await response.json();
    // The standings endpoint returns { data: [...], conferences: [...] }
    const data = json.data || json;
    if (!Array.isArray(data)) return [];
    return data.map((t: Record<string, unknown>) => ({
      team_name: String(t.team_name || ""),
      teamid: Number(t.teamid || 0),
      conference_record: String(t.conference_record || "0-0"),
      conf_wins: Number(t.conference_wins || 0),
      conf_losses: Number(t.conference_losses || 0),
    }));
  } catch {
    return [];
  }
}


function buildTeamNarrative(
  teamName: string, metrics: ComputedMetrics, teamInfo: TeamInfo,
  isHome: boolean, opponentName: string, gameDate: string,
  schedule: TeamGameData[]
): string {
  const [overallW, overallL] = metrics.overallRecord.split("-").map(Number);
  const [confW, confL] = metrics.conferenceRecord.split("-").map(Number);

  let streakDesc = "";
  if (metrics.currentStreak.startsWith("W")) {
    const n = parseInt(metrics.currentStreak.slice(1));
    streakDesc = n >= 5 ? `on a blazing ${n}-game win streak` : n >= 3 ? `riding a ${n}-game win streak` : `winners of their last ${n}`;
  } else if (metrics.currentStreak.startsWith("L")) {
    const n = parseInt(metrics.currentStreak.slice(1));
    streakDesc = n >= 5 ? `struggling through a ${n}-game losing skid` : n >= 3 ? `mired in a ${n}-game losing streak` : `coming off ${n} straight loss${n > 1 ? "es" : ""}`;
  }

  const [l5w] = metrics.last5.split("-").map(Number);
  let recentForm = "";
  if (l5w >= 4) recentForm = "playing excellent basketball recently";
  else if (l5w >= 3) recentForm = "solid in their recent stretch";
  else if (l5w <= 1) recentForm = "struggling to find wins lately";

  let ratingDesc = "";
  if (metrics.kenpomRank) {
    if (metrics.kenpomRank <= 10) ratingDesc = `an elite team ranked #${metrics.kenpomRank} in Composite Rating`;
    else if (metrics.kenpomRank <= 25) ratingDesc = `a top-25 team at #${metrics.kenpomRank} Composite`;
    else if (metrics.kenpomRank <= 50) ratingDesc = `ranked #${metrics.kenpomRank} Composite`;
    else ratingDesc = `sitting at #${metrics.kenpomRank} Composite`;
  }

  let tourneyDesc = "";
  if (teamInfo.tournament_bid_pct !== undefined) {
    const bidPct = teamInfo.tournament_bid_pct;
    if (bidPct >= 95) tourneyDesc = "a virtual lock for the NCAA Tournament";
    else if (bidPct >= 75) tourneyDesc = `in strong position for a tournament bid (${bidPct.toFixed(0)}%)`;
    else if (bidPct >= 50) tourneyDesc = `on the bubble with a ${bidPct.toFixed(0)}% chance at a tournament bid`;
    else if (bidPct >= 25) tourneyDesc = `facing an uphill battle for a tournament bid (${bidPct.toFixed(0)}%)`;
    else if (bidPct > 0) tourneyDesc = `a long shot for the tournament at ${bidPct.toFixed(0)}%`;
  }

  // Game difficulty ranking
  const locFilter = isHome ? "Home" : "Away";
  const diffRank = getGameDifficultyRank(schedule, opponentName, gameDate, locFilter);
  const totalLocGames = schedule.filter((g) => g.location === locFilter && g.team_win_prob !== undefined).length;

  const parts: string[] = [];
  parts.push(`${teamName} enters at ${overallW}-${overallL} overall (${confW}-${confL} conf).`);
  if (ratingDesc) parts.push(`They are ${ratingDesc}.`);
  if (streakDesc) parts.push(`The team is ${streakDesc}.`);
  if (recentForm) parts.push(`They've gone ${metrics.last5} in their last 5, ${recentForm}.`);
  if (tourneyDesc) parts.push(`They are currently ${tourneyDesc}.`);
  if (teamInfo.average_seed) parts.push(`Projected average seed: ${teamInfo.average_seed.toFixed(1)}.`);
  if (diffRank && totalLocGames) {
    parts.push(`This is their ${ordinal(diffRank)} most difficult ${locFilter.toLowerCase()} game of ${totalLocGames}.`);
  }
  return parts.join(" ");
}

// ─── 3-Column Schedule Strip (Away | Neutral | Home) ─────────────────────────
// Matches the team page layout: 3 columns, each with stacked rectangles sorted by difficulty

function ThreeColumnSchedule({
  schedule,
  upcomingOpponent,
  upcomingDate,
}: {
  schedule: TeamGameData[];
  upcomingOpponent: string;
  upcomingDate: string;
}) {
  // Group by location and sort by kenpom rank (hardest at top)
  const grouped = { Away: [] as TeamGameData[], Neutral: [] as TeamGameData[], Home: [] as TeamGameData[] };
  const records = { Away: { w: 0, l: 0 }, Neutral: { w: 0, l: 0 }, Home: { w: 0, l: 0 } };

  schedule.forEach((g) => {
    const loc = g.location as "Away" | "Neutral" | "Home";
    if (grouped[loc]) {
      grouped[loc].push(g);
      if (g.status === "W") records[loc].w++;
      else if (g.status === "L") records[loc].l++;
    }
  });

  // Sort each group by kenpom rank (best rank = hardest opponent at top)
  (["Away", "Neutral", "Home"] as const).forEach((loc) => {
    grouped[loc].sort((a, b) => {
      const aRank = (!a.kenpom_rank || a.kenpom_rank === 999) ? 9999 : a.kenpom_rank;
      const bRank = (!b.kenpom_rank || b.kenpom_rank === 999) ? 9999 : b.kenpom_rank;
      return aRank - bRank;
    });
  });

  const BOX_W = typeof window !== "undefined" && window.innerWidth <= 768 ? 54 : 64;
  const BOX_H = typeof window !== "undefined" && window.innerWidth <= 768 ? 28 : 32;
  const LOGO_SIZE = typeof window !== "undefined" && window.innerWidth <= 768 ? 18 : 22;

  const getBorderColor = (g: TeamGameData, isUpcoming: boolean) => {
    if (isUpcoming) return TEAL;
    if (g.status === "W") return "#22c55e";
    if (g.status === "L") return "#ef4444";
    return "#d1d5db";
  };

  const getBgColor = (g: TeamGameData, isUpcoming: boolean) => {
    if (isUpcoming) return `${TEAL}15`;
    return "white";
  };

  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {(["Away", "Neutral", "Home"] as const).map((loc) => (
        <div key={loc} style={{ flexShrink: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>{loc}</div>
            <div style={{ fontSize: 9, color: "#9ca3af" }}>{records[loc].w}-{records[loc].l}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
            {grouped[loc].length > 0 ? (
              grouped[loc].map((g, idx) => {
                const isUpcoming = g.opponent === upcomingOpponent && g.date === upcomingDate;
                return (
                  <div
                    key={`${g.date}-${g.opponent}-${idx}`}
                    title={`${g.opponent} (${g.kenpom_rank && g.kenpom_rank !== 999 ? `#${g.kenpom_rank}` : "Non D1"}) - ${g.status === "W" ? "Win" : g.status === "L" ? "Loss" : "Upcoming"}`}
                    style={{
                      width: BOX_W,
                      height: BOX_H,
                      border: `2px solid ${getBorderColor(g, isUpcoming)}`,
                      borderRadius: 4,
                      backgroundColor: getBgColor(g, isUpcoming),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 4px",
                      boxShadow: isUpcoming ? `0 0 0 1px ${TEAL}40` : "none",
                    }}
                  >
                    {g.opponent_logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getLogoUrl(g.opponent_logo)}
                        alt={g.opponent}
                        style={{ width: LOGO_SIZE, height: LOGO_SIZE, objectFit: "contain", flexShrink: 0 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div style={{ width: LOGO_SIZE, height: LOGO_SIZE }} />
                    )}
                    <span style={{ fontSize: 8, color: "#6b7280", fontWeight: 500, textAlign: "right" }}>
                      {g.kenpom_rank && g.kenpom_rank !== 999 ? `#${g.kenpom_rank}` : ""}
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{
                width: BOX_W, height: BOX_H,
                border: "1px dashed #d1d5db", borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: "#9ca3af",
              }}>None</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Location Record Badges ──────────────────────────────────────────────────

function LocationRecordBadges({
  metrics,
  highlightLocation,
}: {
  metrics: ComputedMetrics;
  highlightLocation: "Home" | "Away" | "Neutral";
}) {
  const locs: { label: string; value: string; key: "Home" | "Away" | "Neutral" }[] = [
    { label: "Home", value: metrics.homeRecord, key: "Home" },
    { label: "Away", value: metrics.awayRecord, key: "Away" },
    { label: "Neutral", value: metrics.neutralRecord, key: "Neutral" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      {locs.map((l) => {
        const isHighlighted = l.key === highlightLocation;
        return (
          <div
            key={l.key}
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: isHighlighted ? 600 : 400,
              backgroundColor: isHighlighted ? TEAL : "#f3f4f6",
              color: isHighlighted ? "white" : "#6b7280",
              border: isHighlighted ? `1px solid ${TEAL}` : "1px solid #e5e7eb",
            }}
          >
            {l.label}: {l.value}
          </div>
        );
      })}
    </div>
  );
}

// ─── Chart Logo Header ───────────────────────────────────────────────────────
// Renders team logo centered above a chart section

function ChartLogoHeader({ logoUrl, teamName, size = 28 }: { logoUrl?: string; teamName: string; size?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
      <TeamLogo logoUrl={logoUrl} teamName={teamName} size={size} />
    </div>
  );
}

// ─── Next Game Impact Inline Component ───────────────────────────────────────
// Matches the whatif page NextGameImpact component layout exactly:
// Section 1: Conference Tournament (summary metrics + seed probabilities)
// Section 2: NCAA Tournament Probabilities

function NextGameImpactInline({
  teamId,
  conference,
  teamInfo,
}: {
  teamId: string;
  conference: string;
  teamInfo: TeamInfo;
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
      .then((res) => { if (!res.ok) throw new Error(`Failed: ${res.status}`); return res.json(); })
      .then((data: NextGameImpactData) => { if (!controller.signal.aborted) { setImpactData(data); setIsLoading(false); } })
      .catch((e) => { if (controller.signal.aborted) return; setError(e instanceof Error ? e.message : "Failed"); setIsLoading(false); });

    return () => controller.abort();
  }, [teamId, conference]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${TEAL} transparent transparent transparent` }} />
        <span className="text-xs text-gray-400 ml-2">Calculating impact...</span>
      </div>
    );
  }
  if (error || impactData?.error || !impactData?.game) return null;

  const game = impactData.game;
  const teamKey = String(impactData.team_id);
  const teamMetrics = (impactData.current as Record<string, NextGameMetrics>)?.[teamKey] ?? null;
  const winMetrics = (impactData.with_win as Record<string, NextGameMetrics>)?.[teamKey] ?? null;
  const lossMetrics = (impactData.with_loss as Record<string, NextGameMetrics>)?.[teamKey] ?? null;
  if (!teamMetrics || !winMetrics || !lossMetrics) return null;

  const numTeams = teamMetrics.num_teams ?? 16;
  const COL_METRIC = { minWidth: "100px" };
  const COL_DATA = { minWidth: "50px", width: "50px" };

  // Summary metrics - matches whatif page NextGameImpact exactly
  const summaryMetrics: { label: string; key: keyof NextGameMetrics; isPercent: boolean }[] = [
    { label: "#1 Seed %", key: "first_seed_pct", isPercent: true },
    { label: "Top 4 %", key: "top4_pct", isPercent: true },
    { label: "Top 8 %", key: "top8_pct", isPercent: true },
    { label: "Avg Seed", key: "avg_seed", isPercent: false },
    { label: "Proj Conf Wins", key: "avg_conf_wins", isPercent: false },
  ];

  // NCAA Tournament data from team_info
  const bidPct = teamInfo.tournament_bid_pct ?? 0;
  const avgSeed = teamInfo.average_seed;

  // Aggregate NCAA data from win_seed_counts
  const winSeedCounts = teamInfo.win_seed_counts || [];
  const totalScenarios = winSeedCounts.reduce((sum, e) => sum + (e.Count || 0), 0);

  const ncaaStatusDist = new Map<string, number>();
  const ncaaSeedDist = new Map<string, number>();
  let autoBidTotal = 0;
  let atLargeTotal = 0;

  for (const entry of winSeedCounts) {
    const count = entry.Count || 0;
    if (entry.Tournament_Status && totalScenarios > 0) {
      ncaaStatusDist.set(entry.Tournament_Status, (ncaaStatusDist.get(entry.Tournament_Status) || 0) + count);
    }
    if (entry.Seed && entry.Seed !== "None" && totalScenarios > 0) {
      ncaaSeedDist.set(entry.Seed, (ncaaSeedDist.get(entry.Seed) || 0) + count);
    }
    if (totalScenarios > 0) {
      autoBidTotal += ((entry.Auto_Bid_Pct ?? 0) * count) / totalScenarios;
      atLargeTotal += ((entry.At_Large_Pct ?? 0) * count) / totalScenarios;
    }
  }

  const sortedStatus = [...ncaaStatusDist.entries()]
    .map(([status, count]) => ({ status, pct: totalScenarios > 0 ? (count / totalScenarios) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);

  const sortedSeeds = [...ncaaSeedDist.entries()]
    .map(([seed, count]) => ({ seed, pct: totalScenarios > 0 ? (count / totalScenarios) * 100 : 0 }))
    .sort((a, b) => parseInt(a.seed) - parseInt(b.seed))
    .filter((s) => s.pct > 0);

  return (
    <div>
      {/* Matchup header - matches whatif page */}
      <div className="flex items-center justify-center gap-2 mb-3 py-1.5 bg-gray-50 rounded">
        <div className="flex items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getLogoUrl(game.away_team_logo)} alt={game.away_team} className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span className="text-[11px] font-medium">{game.away_team}</span>
        </div>
        <span className="text-[10px] text-gray-400">@</span>
        <div className="flex items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getLogoUrl(game.home_team_logo)} alt={game.home_team} className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span className="text-[11px] font-medium">{game.home_team}</span>
        </div>
        <span className="text-[9px] text-gray-400 ml-1">{game.date}</span>
      </div>

      {/* ═══ CONFERENCE TOURNAMENT PROBABILITIES ═══ */}
      <h4 className="text-sm font-medium mb-2">Conference Tournament Probabilities</h4>

      {/* Summary Metrics Table - matches whatif NextGameImpact */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="text-left py-1.5 px-2 font-normal" style={COL_METRIC}>Metric</th>
            <th className="text-center py-1.5 px-2 font-normal" style={COL_DATA}>Current</th>
            <th className="text-center py-1.5 px-2 font-normal" style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}>Win</th>
            <th className="text-center py-1.5 px-2 font-normal" style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}>Loss</th>
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
                <td className="text-center py-1.5 px-2 tabular-nums" style={isPercent ? getCellColor(cur, "blue") : undefined}>{isPercent ? (cur > 0 ? `${cur.toFixed(1)}%` : "") : cur.toFixed(2)}</td>
                <td className="text-center py-1.5 px-2 tabular-nums" style={isPercent ? getCellColor(win, "blue") : undefined}>{isPercent ? (win > 0 ? `${win.toFixed(1)}%` : "") : win.toFixed(2)}</td>
                <td className="text-center py-1.5 px-2 tabular-nums" style={isPercent ? getCellColor(loss, "blue") : undefined}>{isPercent ? (loss > 0 ? `${loss.toFixed(1)}%` : "") : loss.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Seed Probabilities - matches whatif NextGameImpact */}
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Seed Probabilities</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="text-left py-1.5 px-2 font-normal" style={COL_METRIC}>Seed</th>
              <th className="text-center py-1.5 px-2 font-normal" style={COL_DATA}>Current</th>
              <th className="text-center py-1.5 px-2 font-normal" style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}>Win</th>
              <th className="text-center py-1.5 px-2 font-normal" style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}>Loss</th>
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
                  <td className="py-1.5 px-2">{ordinal(seed)}</td>
                  <td className="text-center py-1.5 px-2 tabular-nums" style={getCellColor(cur, "blue")}>{cur > 0 ? `${cur.toFixed(1)}%` : ""}</td>
                  <td className="text-center py-1.5 px-2 tabular-nums" style={getCellColor(win, "blue")}>{win > 0 ? `${win.toFixed(1)}%` : ""}</td>
                  <td className="text-center py-1.5 px-2 tabular-nums" style={getCellColor(loss, "blue")}>{loss > 0 ? `${loss.toFixed(1)}%` : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ═══ NCAA TOURNAMENT PROBABILITIES ═══ */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <h4 className="text-sm font-medium mb-2">NCAA Tournament Probabilities</h4>

        {/* NCAA Summary Stats */}
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="text-left py-1.5 px-2 font-normal" style={COL_METRIC}>Metric</th>
              <th className="text-center py-1.5 px-2 font-normal" style={COL_DATA}>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-1.5 px-2 text-sm">Tournament Bid %</td>
              <td className="text-center py-1.5 px-2 tabular-nums" style={getCellColor(bidPct, "blue")}>{bidPct > 0 ? `${bidPct.toFixed(1)}%` : ""}</td>
            </tr>
            {avgSeed !== undefined && avgSeed !== null && avgSeed > 0 && (
              <tr className="border-b border-gray-100">
                <td className="py-1.5 px-2 text-sm">Avg Seed</td>
                <td className="text-center py-1.5 px-2 tabular-nums">{avgSeed.toFixed(1)}</td>
              </tr>
            )}
            {autoBidTotal > 0 && (
              <tr className="border-b border-gray-100">
                <td className="py-1.5 px-2 text-sm">Auto Bid %</td>
                <td className="text-center py-1.5 px-2 tabular-nums" style={getCellColor(autoBidTotal, "blue")}>{autoBidTotal.toFixed(1)}%</td>
              </tr>
            )}
            {atLargeTotal > 0 && (
              <tr className="border-b border-gray-100">
                <td className="py-1.5 px-2 text-sm">At-Large %</td>
                <td className="text-center py-1.5 px-2 tabular-nums" style={getCellColor(atLargeTotal, "blue")}>{atLargeTotal.toFixed(1)}%</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Tournament Status Distribution */}
        {sortedStatus.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium mb-2">Tournament Status</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left py-1.5 px-2 font-normal">Status</th>
                  <th className="text-center py-1.5 px-2 font-normal" style={{ width: 65 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {sortedStatus.map(({ status, pct }) => {
                  const isOut = status === "Out of Tournament";
                  return (
                    <tr key={status} className="border-b border-gray-100">
                      <td className="py-1.5 px-2" style={{ color: isOut ? "#a16207" : "#374151", fontWeight: isOut ? 500 : 400 }}>{status}</td>
                      <td className="text-center py-1.5 px-2 tabular-nums" style={isOut ? { backgroundColor: "#fef9c3", color: "#a16207" } : getCellColor(pct, "blue")}>{pct > 0 ? `${pct.toFixed(1)}%` : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* NCAA Seed Distribution */}
        {sortedSeeds.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium mb-2">NCAA Seed Distribution</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left py-1.5 px-2 font-normal">Seed</th>
                  <th className="text-center py-1.5 px-2 font-normal" style={{ width: 65 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {sortedSeeds.map(({ seed, pct }) => (
                  <tr key={seed} className="border-b border-gray-100">
                    <td className="py-1.5 px-2">{ordinal(parseInt(seed))}</td>
                    <td className="text-center py-1.5 px-2 tabular-nums" style={getCellColor(pct, "blue")}>{pct > 0 ? `${pct.toFixed(1)}%` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explainer text - matches whatif page */}
      <p className="text-[9px] text-gray-400 leading-relaxed mt-3 pt-2 border-t border-gray-100">
        Shows projected impact of the team&apos;s next scheduled conference game on seed probabilities. Win and Loss columns show how probabilities change if the team wins or loses that game.
      </p>
    </div>
  );
}


// ─── Head-to-Head Comparison ─────────────────────────────────────────────────

function HeadToHeadComparison({ awayTeam, homeTeam, awayMetrics, homeMetrics, awayInfo, homeInfo }: { awayTeam: string; homeTeam: string; awayMetrics: ComputedMetrics; homeMetrics: ComputedMetrics; awayInfo: TeamInfo; homeInfo: TeamInfo }) {
  const metrics: { label: string; awayValue: string; homeValue: string; isStreak?: boolean }[] = [
    { label: "Record", awayValue: awayMetrics.overallRecord, homeValue: homeMetrics.overallRecord },
    { label: "Conf. Record", awayValue: awayMetrics.conferenceRecord, homeValue: homeMetrics.conferenceRecord },
    { label: "Conf Position", awayValue: awayMetrics.confPosition, homeValue: homeMetrics.confPosition },
    { label: "Composite Rating", awayValue: awayMetrics.kenpomRank ? `#${awayMetrics.kenpomRank}` : "N/A", homeValue: homeMetrics.kenpomRank ? `#${homeMetrics.kenpomRank}` : "N/A" },
    { label: "Current Streak", awayValue: awayMetrics.currentStreak, homeValue: homeMetrics.currentStreak, isStreak: true },
    { label: "Last 5", awayValue: awayMetrics.last5, homeValue: homeMetrics.last5 },
    { label: "Last 10", awayValue: awayMetrics.last10, homeValue: homeMetrics.last10 },
  ];
  const streakColor = (val: string) => { if (val.startsWith("W")) return "#16a34a"; if (val.startsWith("L")) return "#dc2626"; return "#6b7280"; };

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", backgroundColor: "white" }}>
      {/* Team Headers - compact, no conference */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 8px", gap: 6, backgroundColor: awayInfo.primary_color ? `${awayInfo.primary_color}0D` : "#f9fafb" }}>
          <TeamLogo logoUrl={awayInfo.logo_url} teamName={awayTeam} size={28} />
          <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>{awayTeam}</span>
        </div>
        <div style={{ padding: "4px 12px" }}>
          <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>@</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 8px", gap: 6, backgroundColor: homeInfo.primary_color ? `${homeInfo.primary_color}0D` : "#f9fafb" }}>
          <TeamLogo logoUrl={homeInfo.logo_url} teamName={homeTeam} size={28} />
          <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>{homeTeam}</span>
        </div>
      </div>
      {/* Metrics Rows - gray text, not bold */}
      {metrics.map((m, idx) => (
        <div key={m.label} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", borderBottom: idx < metrics.length - 1 ? "1px solid #f3f4f6" : "none", backgroundColor: idx % 2 === 0 ? "white" : "#fafbfc" }}>
          <div style={{ textAlign: "center", padding: "7px 8px", fontWeight: 400, fontSize: 13, color: m.isStreak ? streakColor(m.awayValue) : "#6b7280" }}>{m.awayValue}</div>
          <div style={{ textAlign: "center", padding: "7px 10px", fontSize: 11, color: "#9ca3af", fontWeight: 500, minWidth: 110, borderLeft: "1px solid #f3f4f6", borderRight: "1px solid #f3f4f6" }}>{m.label}</div>
          <div style={{ textAlign: "center", padding: "7px 8px", fontWeight: 400, fontSize: 13, color: m.isStreak ? streakColor(m.homeValue) : "#6b7280" }}>{m.homeValue}</div>
        </div>
      ))}
    </div>
  );
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

declare global {
  interface Window {
    html2canvas?: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>;
  }
}

async function generatePDF(previewRef: React.RefObject<HTMLDivElement | null>, gameName: string) {
  if (!previewRef.current) return;
  if (typeof window !== "undefined" && !window.html2canvas) {
    await new Promise<void>((resolve, reject) => { const s = document.createElement("script"); s.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js"; s.onload = () => resolve(); s.onerror = () => reject(new Error("Failed")); document.body.appendChild(s); });
  }
  const html2canvas = window.html2canvas;
  if (!html2canvas) return;
  if (!(window as unknown as Record<string, unknown>).jspdf) {
    await new Promise<void>((resolve, reject) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"; s.onload = () => resolve(); s.onerror = () => reject(new Error("Failed")); document.body.appendChild(s); });
  }
  interface JsPDFInstance { internal: { pageSize: { getWidth: () => number; getHeight: () => number } }; addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void; save: (filename: string) => void; }
  const jspdfModule = (window as unknown as Record<string, unknown>).jspdf as { jsPDF: new (options: { orientation: string; unit: string; format: string }) => JsPDFInstance };
  if (!jspdfModule) return;
  const element = previewRef.current;
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", windowWidth: Math.max(element.scrollWidth, 960) });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jspdfModule.jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const imgRatio = canvas.height / canvas.width;
  const scaledHeight = usableWidth * imgRatio;
  if (scaledHeight <= usableHeight) { pdf.addImage(imgData, "PNG", margin, margin, usableWidth, scaledHeight); }
  else { const fitWidth = usableHeight / imgRatio; const xOffset = margin + (usableWidth - fitWidth) / 2; pdf.addImage(imgData, "PNG", xOffset, margin, fitWidth, usableHeight); }
  const safeName = gameName.replace(/[^a-zA-Z0-9\-_ ]/g, "").replace(/\s+/g, "_");
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
  const [awayTeamData, setAwayTeamData] = useState<TeamDataResponse | null>(null);
  const [homeTeamData, setHomeTeamData] = useState<TeamDataResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [awayConfStandings, setAwayConfStandings] = useState<ConferenceStandingsTeam[]>([]);
  const [homeConfStandings, setHomeConfStandings] = useState<ConferenceStandingsTeam[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Responsive grid: 2-col on desktop, 1-col on mobile
  const twoColGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: isMobile ? 12 : 16,
  };

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
      } finally { setIsLoading(false); }
    };
    loadGames();
  }, []);

  useEffect(() => {
    if (!selectedGame) { setAwayTeamData(null); setHomeTeamData(null); setAwayConfStandings([]); setHomeConfStandings([]); return; }
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

        // Fetch conference standings for position calculation
        const awayConf = (awayResp as unknown as TeamDataResponse).team_info.conference;
        const homeConf = (homeResp as unknown as TeamDataResponse).team_info.conference;
        const [awayStandings, homeStandings] = await Promise.all([
          fetchConferenceStandings(awayConf),
          awayConf === homeConf ? fetchConferenceStandings(homeConf) : fetchConferenceStandings(homeConf),
        ]);
        setAwayConfStandings(awayStandings);
        setHomeConfStandings(awayConf === homeConf ? awayStandings : homeStandings);
      } catch { setError("Failed to load team preview data."); }
      finally { setIsLoadingPreview(false); }
    };
    loadPreview();
  }, [selectedGame]);

  const filteredGames = useMemo(() => {
    let games = upcomingGames;
    if (conferenceFilter !== "All") games = games.filter((g) => g.home_team_conference === conferenceFilter || g.away_team_conference === conferenceFilter);
    if (teamFilter.trim()) { const search = teamFilter.toLowerCase().trim(); games = games.filter((g) => g.home_team.toLowerCase().includes(search) || g.away_team.toLowerCase().includes(search)); }
    return games;
  }, [upcomingGames, conferenceFilter, teamFilter]);

  const availableConferences = useMemo(() => ["All", ...conferences.filter((c) => c && c !== "FCS")], [conferences]);

  // Compute conf positions
  const awayConfPosition = useMemo(() => awayTeamData ? computeConfPosition(awayTeamData.team_info.team_name, awayConfStandings) : "—", [awayTeamData, awayConfStandings]);
  const homeConfPosition = useMemo(() => homeTeamData ? computeConfPosition(homeTeamData.team_info.team_name, homeConfStandings) : "—", [homeTeamData, homeConfStandings]);

  const awayMetrics = useMemo(() => awayTeamData ? computeMetrics(awayTeamData.schedule, awayTeamData.team_info, awayConfPosition) : null, [awayTeamData, awayConfPosition]);
  const homeMetrics = useMemo(() => homeTeamData ? computeMetrics(homeTeamData.schedule, homeTeamData.team_info, homeConfPosition) : null, [homeTeamData, homeConfPosition]);
  const handlePDF = useCallback(async () => { if (!selectedGame) return; setIsPdfGenerating(true); try { await generatePDF(previewRef, selectedGame.label); } finally { setIsPdfGenerating(false); } }, [selectedGame]);
  const gameKey = (g: UpcomingGame) => `${g.away_team}@${g.home_team}-${g.date_sort}`;

  // Find game date for schedule highlighting
  const selectedGameDate = selectedGame?.date_sort
    ? (() => { try { const d = new Date(selectedGame.date_sort); return `${d.getMonth() + 1}/${d.getDate()}`; } catch { return ""; } })()
    : "";

  return (
    <PageLayoutWrapper title="Game Preview" isLoading={isLoading}>
      <ErrorBoundary>
        <div style={{ maxWidth: 960 }}>
          <p className="text-sm text-gray-500 mb-5">Select an upcoming game to view a head-to-head comparison, win/loss impact, and schedule analysis.</p>

          {error && upcomingGames.length === 0 ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : (
            <>
              {/* Filters */}
              <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Conference</label>
                  <select value={conferenceFilter} onChange={(e) => setConferenceFilter(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, minWidth: 160, backgroundColor: "white" }}>
                    {availableConferences.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 180 }}>
                  <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Search Team</label>
                  <div style={{ position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                    <input type="text" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} placeholder="Filter by team name..." style={{ padding: "6px 10px 6px 28px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: "100%", backgroundColor: "white" }} />
                    {teamFilter && (<button onClick={() => setTeamFilter("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0 }}><X size={14} /></button>)}
                  </div>
                </div>
              </div>

              {/* Game Selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, display: "block", marginBottom: 4 }}>Select Game ({filteredGames.length} upcoming)</label>
                <select value={selectedGame ? gameKey(selectedGame) : ""} onChange={(e) => { const val = e.target.value; if (!val) { setSelectedGame(null); return; } setSelectedGame(filteredGames.find((g) => gameKey(g) === val) || null); }} style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: "100%", backgroundColor: "white", cursor: "pointer" }}>
                  <option value="">— Choose an upcoming game —</option>
                  {filteredGames.map((g) => (<option key={gameKey(g)} value={gameKey(g)}>{g.label}</option>))}
                </select>
              </div>

              {/* ── Game Preview Content ─────────────────────── */}
              {selectedGame && (
                <>
                  {isLoadingPreview ? (
                    <div className="py-12"><LoadingSpinner /></div>
                  ) : awayTeamData && homeTeamData && awayMetrics && homeMetrics ? (
                    <>
                      {/* PDF Download */}
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                        <button onClick={handlePDF} disabled={isPdfGenerating} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", backgroundColor: isPdfGenerating ? "#9ca3af" : "#18627b", color: "white", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: isPdfGenerating ? "not-allowed" : "pointer" }}>
                          <Download size={14} />{isPdfGenerating ? "Generating..." : "Download PDF"}
                        </button>
                      </div>

                      {/* ═══ Printable Preview Area ═══ */}
                      <div ref={previewRef} style={{ backgroundColor: "white", padding: isMobile ? 10 : 20 }}>

                        {/* Header Banner */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #e5e7eb" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <div><img src="/images/JThom_Logo.png" alt="Logo" style={{ height: 24 }} /></div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", textAlign: "center", flex: 1, padding: "0 12px" }}>Game Preview — {selectedGame.date}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>{new Date().toLocaleDateString()}</div>
                        </div>

                        {/* 1. Head-to-Head Comparison */}
                        <HeadToHeadComparison awayTeam={selectedGame.away_team} homeTeam={selectedGame.home_team} awayMetrics={awayMetrics} homeMetrics={homeMetrics} awayInfo={awayTeamData.team_info} homeInfo={homeTeamData.team_info} />

                        {/* 2. Team Narratives + Vertical Schedule + Location Records */}
                        <div style={{ marginTop: 16, ...twoColGrid }}>
                          {/* Away team narrative */}
                          <div style={{ padding: 10, backgroundColor: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <TeamLogo logoUrl={awayTeamData.team_info.logo_url} teamName={selectedGame.away_team} size={18} />
                              <span style={{ fontWeight: 600, fontSize: 12, color: "#374151" }}>{selectedGame.away_team}</span>
                            </div>
                            <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.55, margin: "0 0 8px 0" }}>
                              {buildTeamNarrative(selectedGame.away_team, awayMetrics, awayTeamData.team_info, false, selectedGame.home_team, selectedGameDate, awayTeamData.schedule)}
                            </p>
                            <LocationRecordBadges metrics={awayMetrics} highlightLocation="Away" />
                            <div style={{ marginTop: 8 }}>
                              <span style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 3 }}>Season Schedule (by difficulty)</span>
                              <ThreeColumnSchedule schedule={awayTeamData.schedule} upcomingOpponent={selectedGame.home_team} upcomingDate={selectedGameDate} />
                            </div>
                          </div>
                          {/* Home team narrative */}
                          <div style={{ padding: 10, backgroundColor: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <TeamLogo logoUrl={homeTeamData.team_info.logo_url} teamName={selectedGame.home_team} size={18} />
                              <span style={{ fontWeight: 600, fontSize: 12, color: "#374151" }}>{selectedGame.home_team}</span>
                            </div>
                            <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.55, margin: "0 0 8px 0" }}>
                              {buildTeamNarrative(selectedGame.home_team, homeMetrics, homeTeamData.team_info, true, selectedGame.away_team, selectedGameDate, homeTeamData.schedule)}
                            </p>
                            <LocationRecordBadges metrics={homeMetrics} highlightLocation="Home" />
                            <div style={{ marginTop: 8 }}>
                              <span style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 3 }}>Season Schedule (by difficulty)</span>
                              <ThreeColumnSchedule schedule={homeTeamData.schedule} upcomingOpponent={selectedGame.away_team} upcomingDate={selectedGameDate} />
                            </div>
                          </div>
                        </div>

                        {/* 3. Next Game Win/Loss Impact - Conference + NCAA (full output) */}
                        <div style={{ marginTop: 20 }}>
                          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10, paddingBottom: 5, borderBottom: "1px solid #e5e7eb" }}>Next Game Win/Loss Impact</h3>
                          <div style={twoColGrid}>
                            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, backgroundColor: "white" }}>
                              <NextGameImpactInline teamId={awayTeamData.team_info.team_id} conference={awayTeamData.team_info.conference} teamInfo={awayTeamData.team_info} />
                            </div>
                            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, backgroundColor: "white" }}>
                              <NextGameImpactInline teamId={homeTeamData.team_info.team_id} conference={homeTeamData.team_info.conference} teamInfo={homeTeamData.team_info} />
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* ═══ End Printable Area ═══ */}

                      {/* 4. Win Values Over Time (interactive - outside PDF) */}
                      <div style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10, paddingBottom: 5, borderBottom: "1px solid #e5e7eb" }}>Win Values Over Time</h3>
                        <div style={twoColGrid}>
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, backgroundColor: "white" }}>
                            <ChartLogoHeader logoUrl={awayTeamData.team_info.logo_url} teamName={selectedGame.away_team} />
                            <TeamWinValues schedule={awayTeamData.schedule} logoUrl={awayTeamData.team_info.logo_url} primaryColor={awayTeamData.team_info.primary_color} />
                          </div>
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, backgroundColor: "white" }}>
                            <ChartLogoHeader logoUrl={homeTeamData.team_info.logo_url} teamName={selectedGame.home_team} />
                            <TeamWinValues schedule={homeTeamData.schedule} logoUrl={homeTeamData.team_info.logo_url} primaryColor={homeTeamData.team_info.primary_color} />
                          </div>
                        </div>
                      </div>

                      {/* 5. Schedule Difficulty (interactive - outside PDF) */}
                      <div style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10, paddingBottom: 5, borderBottom: "1px solid #e5e7eb" }}>Schedule Difficulty</h3>
                        <div style={twoColGrid}>
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, backgroundColor: "white" }}>
                            <ChartLogoHeader logoUrl={awayTeamData.team_info.logo_url} teamName={selectedGame.away_team} />
                            <BasketballTeamScheduleDifficulty
                              schedule={awayTeamData.schedule}
                              allScheduleData={(awayTeamData.all_schedule_data as AllScheduleGame[]) || []}
                              teamConference={awayTeamData.team_info.conference}
                              teamColor={awayTeamData.team_info.primary_color || TEAL}
                              teamName={selectedGame.away_team}
                              highlightOpponent={selectedGame.home_team}
                            />
                          </div>
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, backgroundColor: "white" }}>
                            <ChartLogoHeader logoUrl={homeTeamData.team_info.logo_url} teamName={selectedGame.home_team} />
                            <BasketballTeamScheduleDifficulty
                              schedule={homeTeamData.schedule}
                              allScheduleData={(homeTeamData.all_schedule_data as AllScheduleGame[]) || []}
                              teamConference={homeTeamData.team_info.conference}
                              teamColor={homeTeamData.team_info.primary_color || TEAL}
                              teamName={selectedGame.home_team}
                              highlightOpponent={selectedGame.away_team}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 6. Season Wins Breakdown (interactive - outside PDF) */}
                      <div style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10, paddingBottom: 5, borderBottom: "1px solid #e5e7eb" }}>Season Wins Breakdown</h3>
                        <div style={twoColGrid}>
                          <div>
                            <ChartLogoHeader logoUrl={awayTeamData.team_info.logo_url} teamName={selectedGame.away_team} />
                            <BasketballTeamWinsBreakdown schedule={awayTeamData.schedule} teamName={selectedGame.away_team} conference={awayTeamData.team_info.conference} primaryColor={awayTeamData.team_info.primary_color || "#18627b"} secondaryColor={awayTeamData.team_info.secondary_color} logoUrl={awayTeamData.team_info.logo_url} />
                          </div>
                          <div>
                            <ChartLogoHeader logoUrl={homeTeamData.team_info.logo_url} teamName={selectedGame.home_team} />
                            <BasketballTeamWinsBreakdown schedule={homeTeamData.schedule} teamName={selectedGame.home_team} conference={homeTeamData.team_info.conference} primaryColor={homeTeamData.team_info.primary_color || "#18627b"} secondaryColor={homeTeamData.team_info.secondary_color} logoUrl={homeTeamData.team_info.logo_url} />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : error ? (
                    <div className="text-center py-8 text-red-500 text-sm">{error}</div>
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
