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

const TEAL = "#0097b2";

// ─── Utility Functions ───────────────────────────────────────────────────────

function computeMetrics(schedule: TeamGameData[], teamInfo: TeamInfo): ComputedMetrics {
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
  };
}

function getGameDifficultyRank(schedule: TeamGameData[], opponentName: string, gameDate: string, locationFilter?: string): number | null {
  // Filter to location if provided (e.g. only "Home" games for home team)
  let games = schedule;
  if (locationFilter) games = games.filter((g) => g.location === locationFilter);
  // Sort by difficulty: lowest win prob = hardest
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

// ─── Mini Schedule Strip ─────────────────────────────────────────────────────

function MiniScheduleStrip({
  schedule,
  upcomingOpponent,
  upcomingDate,
}: {
  schedule: TeamGameData[];
  upcomingOpponent: string;
  upcomingDate: string;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
      {schedule.map((g, i) => {
        const isThisGame = g.opponent === upcomingOpponent && g.date === upcomingDate;
        const isWin = g.status === "W";
        const isLoss = g.status === "L";
        let bg = "#d1d5db"; // gray for future
        if (isThisGame) bg = TEAL;
        else if (isWin) bg = "#16a34a";
        else if (isLoss) bg = "#dc2626";

        return (
          <div
            key={`${g.date}-${g.opponent}-${i}`}
            title={`${g.date} ${g.status === "W" || g.status === "L" ? g.status : ""} vs ${g.opponent}`}
            style={{
              width: 18,
              height: 18,
              borderRadius: 2,
              backgroundColor: bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              border: isThisGame ? `2px solid ${TEAL}` : "none",
              boxShadow: isThisGame ? `0 0 0 1px white, 0 0 0 3px ${TEAL}` : "none",
            }}
          >
            {g.opponent_logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getLogoUrl(g.opponent_logo)}
                alt=""
                style={{ width: 12, height: 12, objectFit: "contain", opacity: isThisGame ? 1 : 0.85 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
        );
      })}
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

// ─── Next Game Impact Inline Component ───────────────────────────────────────

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

  // Conference metrics
  const confMetrics: { label: string; key: keyof NextGameMetrics; isPercent: boolean }[] = [
    { label: "#1 Seed %", key: "first_seed_pct", isPercent: true },
    { label: "Top 4 %", key: "top4_pct", isPercent: true },
    { label: "Avg Seed", key: "avg_seed", isPercent: false },
    { label: "Proj Conf Wins", key: "avg_conf_wins", isPercent: false },
  ];

  // NCAA Tournament static info from team_info
  const bidPct = teamInfo.tournament_bid_pct;
  const avgSeed = teamInfo.average_seed;

  return (
    <div>
      {/* Matchup header */}
      <div className="flex items-center justify-center gap-2 mb-3 py-1 bg-gray-50 rounded">
        <div className="flex items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getLogoUrl(game.away_team_logo)} alt={game.away_team} className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span className="text-[10px] font-medium">{game.away_team}</span>
        </div>
        <span className="text-[9px] text-gray-400">@</span>
        <div className="flex items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getLogoUrl(game.home_team_logo)} alt={game.home_team} className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span className="text-[10px] font-medium">{game.home_team}</span>
        </div>
      </div>

      {/* Conference Tournament Impact */}
      <h5 style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Conference Tournament</h5>
      <table className="w-full text-xs mb-3">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="text-left py-1 px-1.5 font-normal" style={COL_METRIC}>Metric</th>
            <th className="text-center py-1 px-1.5 font-normal" style={COL_DATA}>Now</th>
            <th className="text-center py-1 px-1.5 font-normal" style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}>Win</th>
            <th className="text-center py-1 px-1.5 font-normal" style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}>Loss</th>
          </tr>
        </thead>
        <tbody>
          {confMetrics.map(({ label, key, isPercent }) => {
            const cur = teamMetrics[key] as number;
            const win = winMetrics[key] as number;
            const loss = lossMetrics[key] as number;
            return (
              <tr key={key} className="border-b border-gray-100">
                <td className="py-1 px-1.5">{label}</td>
                <td className="text-center py-1 px-1.5 tabular-nums" style={isPercent ? getCellColor(cur, "blue") : undefined}>{isPercent ? (cur > 0 ? `${cur.toFixed(1)}%` : "") : cur.toFixed(2)}</td>
                <td className="text-center py-1 px-1.5 tabular-nums" style={isPercent ? getCellColor(win, "blue") : undefined}>{isPercent ? (win > 0 ? `${win.toFixed(1)}%` : "") : win.toFixed(2)}</td>
                <td className="text-center py-1 px-1.5 tabular-nums" style={isPercent ? getCellColor(loss, "blue") : undefined}>{isPercent ? (loss > 0 ? `${loss.toFixed(1)}%` : "") : loss.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Seed Distribution */}
      <h5 style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Conf Seed Probabilities</h5>
      <table className="w-full text-xs mb-3">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="text-left py-1 px-1.5 font-normal" style={COL_METRIC}>Seed</th>
            <th className="text-center py-1 px-1.5 font-normal" style={COL_DATA}>Now</th>
            <th className="text-center py-1 px-1.5 font-normal" style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}>Win</th>
            <th className="text-center py-1 px-1.5 font-normal" style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}>Loss</th>
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
                <td className="py-1 px-1.5">{ordinal(seed)}</td>
                <td className="text-center py-1 px-1.5 tabular-nums" style={getCellColor(cur, "blue")}>{cur > 0 ? `${cur.toFixed(1)}%` : ""}</td>
                <td className="text-center py-1 px-1.5 tabular-nums" style={getCellColor(win, "blue")}>{win > 0 ? `${win.toFixed(1)}%` : ""}</td>
                <td className="text-center py-1 px-1.5 tabular-nums" style={getCellColor(loss, "blue")}>{loss > 0 ? `${loss.toFixed(1)}%` : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* NCAA Tournament Summary */}
      <h5 style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>NCAA Tournament</h5>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {bidPct !== undefined && (
          <div style={{ padding: "4px 8px", backgroundColor: "#f0f9ff", borderRadius: 4, border: "1px solid #bae6fd" }}>
            <span style={{ fontSize: 10, color: "#6b7280" }}>Bid %: </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0369a1" }}>{bidPct.toFixed(1)}%</span>
          </div>
        )}
        {avgSeed !== undefined && avgSeed > 0 && (
          <div style={{ padding: "4px 8px", backgroundColor: "#f0f9ff", borderRadius: 4, border: "1px solid #bae6fd" }}>
            <span style={{ fontSize: 10, color: "#6b7280" }}>Avg Seed: </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0369a1" }}>{avgSeed.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Head-to-Head Comparison ─────────────────────────────────────────────────

function HeadToHeadComparison({ awayTeam, homeTeam, awayMetrics, homeMetrics, awayInfo, homeInfo }: { awayTeam: string; homeTeam: string; awayMetrics: ComputedMetrics; homeMetrics: ComputedMetrics; awayInfo: TeamInfo; homeInfo: TeamInfo }) {
  const metrics: { label: string; awayValue: string; homeValue: string; isStreak?: boolean }[] = [
    { label: "Record", awayValue: awayMetrics.overallRecord, homeValue: homeMetrics.overallRecord },
    { label: "Conf. Record", awayValue: awayMetrics.conferenceRecord, homeValue: homeMetrics.conferenceRecord },
    { label: "Conf Position", awayValue: awayMetrics.currentConfStanding ? ordinal(awayMetrics.currentConfStanding) : "—", homeValue: homeMetrics.currentConfStanding ? ordinal(homeMetrics.currentConfStanding) : "—" },
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
      } finally { setIsLoading(false); }
    };
    loadGames();
  }, []);

  useEffect(() => {
    if (!selectedGame) { setAwayTeamData(null); setHomeTeamData(null); return; }
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
  const awayMetrics = useMemo(() => awayTeamData ? computeMetrics(awayTeamData.schedule, awayTeamData.team_info) : null, [awayTeamData]);
  const homeMetrics = useMemo(() => homeTeamData ? computeMetrics(homeTeamData.schedule, homeTeamData.team_info) : null, [homeTeamData]);
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
                      <div ref={previewRef} style={{ backgroundColor: "white", padding: 20 }}>

                        {/* Header Banner */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #e5e7eb" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <div><img src="/images/JThom_Logo.png" alt="Logo" style={{ height: 24 }} /></div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", textAlign: "center", flex: 1, padding: "0 12px" }}>Game Preview — {selectedGame.date}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>{new Date().toLocaleDateString()}</div>
                        </div>

                        {/* 1. Head-to-Head Comparison */}
                        <HeadToHeadComparison awayTeam={selectedGame.away_team} homeTeam={selectedGame.home_team} awayMetrics={awayMetrics} homeMetrics={homeMetrics} awayInfo={awayTeamData.team_info} homeInfo={homeTeamData.team_info} />

                        {/* 2. Team Narratives + Schedule Strips + Location Records */}
                        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
                              <span style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 3 }}>Season Schedule</span>
                              <MiniScheduleStrip schedule={awayTeamData.schedule} upcomingOpponent={selectedGame.home_team} upcomingDate={selectedGameDate} />
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
                              <span style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 3 }}>Season Schedule</span>
                              <MiniScheduleStrip schedule={homeTeamData.schedule} upcomingOpponent={selectedGame.away_team} upcomingDate={selectedGameDate} />
                            </div>
                          </div>
                        </div>

                        {/* 3. Next Game Win/Loss Impact */}
                        <div style={{ marginTop: 20 }}>
                          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10, paddingBottom: 5, borderBottom: "1px solid #e5e7eb" }}>Next Game Win/Loss Impact</h3>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, backgroundColor: "white" }}>
                            <TeamWinValues schedule={awayTeamData.schedule} logoUrl={awayTeamData.team_info.logo_url} primaryColor={awayTeamData.team_info.primary_color} />
                          </div>
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, backgroundColor: "white" }}>
                            <TeamWinValues schedule={homeTeamData.schedule} logoUrl={homeTeamData.team_info.logo_url} primaryColor={homeTeamData.team_info.primary_color} />
                          </div>
                        </div>
                      </div>

                      {/* 5. Schedule Difficulty (interactive - outside PDF) */}
                      <div style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10, paddingBottom: 5, borderBottom: "1px solid #e5e7eb" }}>Schedule Difficulty</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, backgroundColor: "white" }}>
                            <BasketballTeamScheduleDifficulty
                              schedule={awayTeamData.schedule}
                              allScheduleData={(awayTeamData.all_schedule_data as AllScheduleGame[]) || []}
                              teamConference={awayTeamData.team_info.conference}
                              teamColor={awayTeamData.team_info.primary_color || TEAL}
                              teamName={selectedGame.away_team}
                            />
                          </div>
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, backgroundColor: "white" }}>
                            <BasketballTeamScheduleDifficulty
                              schedule={homeTeamData.schedule}
                              allScheduleData={(homeTeamData.all_schedule_data as AllScheduleGame[]) || []}
                              teamConference={homeTeamData.team_info.conference}
                              teamColor={homeTeamData.team_info.primary_color || TEAL}
                              teamName={selectedGame.home_team}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 6. Season Wins Breakdown (interactive - outside PDF) */}
                      <div style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10, paddingBottom: 5, borderBottom: "1px solid #e5e7eb" }}>Season Wins Breakdown</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <BasketballTeamWinsBreakdown schedule={awayTeamData.schedule} teamName={selectedGame.away_team} conference={awayTeamData.team_info.conference} primaryColor={awayTeamData.team_info.primary_color || "#18627b"} secondaryColor={awayTeamData.team_info.secondary_color} logoUrl={awayTeamData.team_info.logo_url} />
                          <BasketballTeamWinsBreakdown schedule={homeTeamData.schedule} teamName={selectedGame.home_team} conference={homeTeamData.team_info.conference} primaryColor={homeTeamData.team_info.primary_color || "#18627b"} secondaryColor={homeTeamData.team_info.secondary_color} logoUrl={homeTeamData.team_info.logo_url} />
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
