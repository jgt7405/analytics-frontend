// src/app/basketball/game-preview/page.tsx
"use client";

import BasketballTeamScheduleDifficulty from "@/components/features/basketball/BasketballTeamScheduleDifficulty";
import BasketballTeamWinsBreakdown from "@/components/features/basketball/BasketballTeamWinsBreakdown";
import TeamWinValues from "@/components/features/basketball/TeamWinValues";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { getCellColor } from "@/lib/color-utils";
import { api } from "@/services/api";
import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
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
  is_next_game_for_both: boolean;
  game_id: string;
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
  // NCAA tournament projection fields
  tournament_bid_pct?: number;
  average_seed?: number | null;
  ncaa_seed_distribution?: Record<string, number>;
  // Dynamic keys: seed_N_pct
  [key: string]: number | Record<string, number> | null | undefined;
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

interface ConfChampData {
  team_name: string;
  actual_total_wins?: number;
  actual_total_losses?: number;
  proj_losses?: number;
  pct_prob_win_conf_tourney_game_1: number;
  pct_prob_win_conf_tourney_game_2: number;
  pct_prob_win_conf_tourney_game_3: number;
  pct_prob_win_conf_tourney_game_4: number;
  pct_prob_win_conf_tourney_game_5: number;
  pct_prob_win_conf_tourney_game_6: number;
  wins_for_bubble: number;
  wins_for_1_seed: number;
  wins_for_2_seed: number;
  wins_for_3_seed: number;
  wins_for_4_seed: number;
  wins_for_5_seed: number;
  wins_for_6_seed: number;
  wins_for_7_seed: number;
  wins_for_8_seed: number;
  wins_for_9_seed: number;
  wins_for_10_seed: number;
  season_total_proj_wins_avg: number;
}

const TEAL = "#0097b2";

// ─── Utility Functions ───────────────────────────────────────────────────────

function computeMetrics(
  schedule: TeamGameData[],
  teamInfo: TeamInfo,
  confPosition: string,
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

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Capitalize the first letter of a string. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getLogoUrl(filename?: string): string | undefined {
  if (!filename) return undefined;
  if (filename.startsWith("http") || filename.startsWith("/")) return filename;
  return `/images/team_logos/${filename}`;
}

function computeConfPosition(
  teamName: string,
  standings: ConferenceStandingsTeam[],
): string {
  if (!standings.length) return "—";
  const sorted = [...standings].sort((a, b) => {
    // Sort by conference wins (descending), then by conference losses (ascending)
    if (b.conf_wins !== a.conf_wins) return b.conf_wins - a.conf_wins;
    if (a.conf_losses !== b.conf_losses) return a.conf_losses - b.conf_losses;
    // If tied on wins/losses, maintain stable sort order
    return 0;
  });

  const positionMap = new Map<string, number>();
  let currentPosition = 1;
  let prevWins = -1;
  let prevLosses = -1;

  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i];

    // Check if this team has different record than previous
    if (team.conf_wins !== prevWins || team.conf_losses !== prevLosses) {
      // New record tier - update position to account for ties
      currentPosition = i + 1;
      prevWins = team.conf_wins;
      prevLosses = team.conf_losses;
    }

    positionMap.set(team.team_name, currentPosition);
  }

  const pos = positionMap.get(teamName);
  if (!pos) return "—";

  // Count how many teams are at this position
  const teamsAtPosition = Array.from(positionMap.values()).filter(
    (p) => p === pos,
  ).length;

  if (teamsAtPosition > 1) return `T-${ordinal(pos)}`;
  return ordinal(pos);
}

async function fetchConferenceStandings(
  conference: string,
): Promise<ConferenceStandingsTeam[]> {
  try {
    const confFormatted = conference.replace(/ /g, "_");
    const response = await fetch(
      `/api/proxy/standings/${confFormatted}`, // ← CORRECT endpoint (has conference_wins/losses)
    );
    if (!response.ok) return [];
    const json = await response.json();
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

async function fetchConfChampDataForTeam(
  conference: string,
  teamName: string,
): Promise<ConfChampData | null> {
  try {
    const confFormatted = conference.replace(/\s+/g, "_");
    const response = await fetch(
      `/api/proxy/basketball/conf_champ_analysis/${confFormatted}`,
    );
    if (!response.ok) return null;
    const result = await response.json();
    if (result.data && Array.isArray(result.data)) {
      return (
        result.data.find((t: ConfChampData) => t.team_name === teamName) || null
      );
    }
    return null;
  } catch {
    return null;
  }
}

function buildTeamNarrative(
  teamName: string,
  metrics: ComputedMetrics,
  _teamInfo: TeamInfo,
  isHome: boolean,
  opponentName: string,
  _gameDate: string,
  schedule: TeamGameData[],
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

  // ─── Rich game difficulty context ───
  const locFilter = isHome ? "Home" : "Away";
  const locLabel = locFilter.toLowerCase();
  const locGames = schedule.filter((g) => g.location === locFilter);
  const locCompleted = locGames.filter(
    (g) => g.status === "W" || g.status === "L",
  );
  const locW = locCompleted.filter((g) => g.status === "W").length;
  const locL = locCompleted.filter((g) => g.status === "L").length;

  // Rank this game by difficulty within location games using kenpom_win_prob
  const withProb = locGames
    .filter(
      (g) => g.kenpom_win_prob !== undefined && g.kenpom_win_prob !== null,
    )
    .sort((a, b) => (a.kenpom_win_prob ?? 1) - (b.kenpom_win_prob ?? 1));

  const gameIdx = withProb.findIndex((g) => g.opponent === opponentName);

  const parts: string[] = [];
  parts.push(
    `${teamName} enters at ${overallW}-${overallL} overall (${confW}-${confL} conf).`,
  );
  if (streakDesc) parts.push(`The team is ${streakDesc}.`);
  if (recentForm)
    parts.push(`They've gone ${metrics.last5} in their last 5, ${recentForm}.`);

  if (gameIdx >= 0 && withProb.length > 0) {
    const rank = gameIdx + 1;
    const total = withProb.length;
    const gameProb = Math.round((withProb[gameIdx].kenpom_win_prob ?? 0) * 100);
    parts.push(
      `This is the ${ordinal(rank)} most difficult ${locLabel} game of ${total} for ${teamName} (with ${gameProb}% win probability for the 30th rated team).`,
    );

    // Record in harder games
    const harderGames = withProb.slice(0, gameIdx);
    const harderW = harderGames.filter((g) => g.status === "W").length;
    const harderL = harderGames.filter((g) => g.status === "L").length;
    const harderUpcoming = harderGames.filter(
      (g) => g.status !== "W" && g.status !== "L",
    ).length;
    if (harderGames.length > 0) {
      const hParts: string[] = [];
      if (harderW > 0 || harderL > 0)
        hParts.push(
          `they are ${harderW}-${harderL} in more difficult ${locLabel} games`,
        );
      if (harderUpcoming > 0)
        hParts.push(
          `${harderUpcoming} tougher ${locLabel} game${harderUpcoming !== 1 ? "s" : ""} remaining`,
        );
      if (hParts.length > 0) parts.push(cap(hParts.join(", with ")) + ".");
    }

    // Overall location record
    parts.push(
      `Overall they are ${locW}-${locL} ${locLabel === "home" ? "at home" : "on the road"}.`,
    );

    // Easier games context
    const easierGames = withProb.slice(gameIdx + 1);
    const easierW = easierGames.filter((g) => g.status === "W").length;
    const easierL = easierGames.filter((g) => g.status === "L").length;
    if (easierL > 0 && easierW > 0) {
      parts.push(
        `They've lost ${easierL} ${locLabel} game${easierL !== 1 ? "s" : ""} easier than this one (and ${easierW} win${easierW !== 1 ? "s" : ""} in games easier than this one).`,
      );
    } else if (easierL > 0) {
      parts.push(
        `They've lost ${easierL} ${locLabel} game${easierL !== 1 ? "s" : ""} easier than this one.`,
      );
    } else if (easierW > 0) {
      parts.push(
        `They've won all ${easierW} ${locLabel} game${easierW !== 1 ? "s" : ""} easier than this one.`,
      );
    }
  } else {
    parts.push(
      `Overall they are ${locW}-${locL} ${locLabel === "home" ? "at home" : "on the road"}.`,
    );
  }

  return parts.join(" ");
}

// ─── Dynamic Section Narratives ──────────────────────────────────────────────

function buildHeadToHeadNarrative(
  awayTeam: string,
  homeTeam: string,
  awayMetrics: ComputedMetrics,
  homeMetrics: ComputedMetrics,
  awayInfo: TeamInfo,
  homeInfo: TeamInfo,
  winProb: number | null,
): string {
  const parts: string[] = [];

  if (winProb !== null) {
    const homeWinPct = winProb > 1 ? winProb : winProb * 100;
    const awayWinPct = 100 - homeWinPct;
    const favorite = homeWinPct > awayWinPct ? homeTeam : awayTeam;
    const favPct = Math.round(Math.max(homeWinPct, awayWinPct));
    if (favPct >= 75) {
      parts.push(
        `${favorite} is a heavy favorite at ${favPct}% win probability.`,
      );
    } else if (favPct >= 60) {
      parts.push(`${favorite} is favored at ${favPct}% win probability.`);
    } else {
      parts.push(
        `This projects as a toss-up — ${favorite} is a slim favorite at ${favPct}%.`,
      );
    }
  }

  if (awayMetrics.kenpomRank && homeMetrics.kenpomRank) {
    const gap = Math.abs(awayMetrics.kenpomRank - homeMetrics.kenpomRank);
    if (gap >= 50) {
      const higher =
        awayMetrics.kenpomRank < homeMetrics.kenpomRank ? awayTeam : homeTeam;
      parts.push(
        `${higher} holds a significant ratings edge (#${Math.min(awayMetrics.kenpomRank, homeMetrics.kenpomRank)} vs #${Math.max(awayMetrics.kenpomRank, homeMetrics.kenpomRank)} Composite).`,
      );
    } else if (gap >= 15) {
      const higher =
        awayMetrics.kenpomRank < homeMetrics.kenpomRank ? awayTeam : homeTeam;
      parts.push(
        `${higher} is the higher-rated team (#${Math.min(awayMetrics.kenpomRank, homeMetrics.kenpomRank)} vs #${Math.max(awayMetrics.kenpomRank, homeMetrics.kenpomRank)} Composite).`,
      );
    } else {
      parts.push(
        `Closely rated teams — ${awayTeam} #${awayMetrics.kenpomRank} vs ${homeTeam} #${homeMetrics.kenpomRank} Composite.`,
      );
    }
  }

  const awayStreakW = awayMetrics.currentStreak.startsWith("W")
    ? parseInt(awayMetrics.currentStreak.slice(1))
    : 0;
  const homeStreakW = homeMetrics.currentStreak.startsWith("W")
    ? parseInt(homeMetrics.currentStreak.slice(1))
    : 0;
  const awayStreakL = awayMetrics.currentStreak.startsWith("L")
    ? parseInt(awayMetrics.currentStreak.slice(1))
    : 0;
  const homeStreakL = homeMetrics.currentStreak.startsWith("L")
    ? parseInt(homeMetrics.currentStreak.slice(1))
    : 0;

  if (awayStreakW >= 3 && homeStreakW >= 3) {
    parts.push(
      `Both teams are hot — ${awayTeam} has won ${awayStreakW} straight, ${homeTeam} has won ${homeStreakW} in a row.`,
    );
  } else if (awayStreakW >= 3 && homeStreakL >= 3) {
    parts.push(
      `Momentum favors ${awayTeam} (${awayStreakW}-game win streak) against a ${homeTeam} squad that has dropped ${homeStreakL} straight.`,
    );
  } else if (homeStreakW >= 3 && awayStreakL >= 3) {
    parts.push(
      `${homeTeam} carries a ${homeStreakW}-game win streak while ${awayTeam} looks to snap a ${awayStreakL}-game skid.`,
    );
  }

  if (
    awayMetrics.confPosition !== "—" &&
    homeMetrics.confPosition !== "—" &&
    awayInfo.conference === homeInfo.conference
  ) {
    parts.push(
      `In conference play, ${awayTeam} sits ${awayMetrics.confPosition} while ${homeTeam} is ${homeMetrics.confPosition}.`,
    );
  }

  return (
    parts.join(" ") ||
    `${awayTeam} (${awayMetrics.overallRecord}) visits ${homeTeam} (${homeMetrics.overallRecord}) in this matchup.`
  );
}

function buildNextGameImpactNarrative(
  awayTeam: string,
  homeTeam: string,
  awayInfo: TeamInfo,
  homeInfo: TeamInfo,
  awayImpact?: NextGameImpactData | null,
  homeImpact?: NextGameImpactData | null,
): string {
  const teamParagraph = (
    team: string,
    info: TeamInfo,
    impact: NextGameImpactData | null | undefined,
  ) => {
    const parts: string[] = [];

    // Extract metrics if available
    const teamKey = impact ? String(impact.team_id) : null;
    const current = teamKey
      ? (impact?.current as Record<string, NextGameMetrics>)?.[teamKey]
      : null;
    const win = teamKey
      ? (impact?.with_win as Record<string, NextGameMetrics>)?.[teamKey]
      : null;
    const loss = teamKey
      ? (impact?.with_loss as Record<string, NextGameMetrics>)?.[teamKey]
      : null;

    if (win && loss && current) {
      // Conference tournament impact
      const confParts: string[] = [];

      // Top 4 seed
      const winTop4 = Math.round(win.top4_pct);
      const lossTop4 = Math.round(loss.top4_pct);
      if (winTop4 > 10 || lossTop4 > 10) {
        if (winTop4 >= 80 && lossTop4 >= 80) {
          confParts.push(
            `a top 4 seed is likely either way — ${winTop4}% with a win and ${lossTop4}% with a loss`,
          );
        } else if (winTop4 >= 40 && lossTop4 < 15) {
          confParts.push(
            `with a win the probability of a top 4 seed increases to ${winTop4}%, but is unlikely with a loss at only ${lossTop4}%`,
          );
        } else {
          confParts.push(
            `a top 4 seed is at ${winTop4}% with a win and ${lossTop4}% with a loss`,
          );
        }
      }

      // Top 8 seed
      const winTop8 = Math.round(win.top8_pct);
      const lossTop8 = Math.round(loss.top8_pct);
      if (winTop8 >= 90 && lossTop8 >= 80) {
        confParts.push(
          `a top 8 seed is pretty likely either way — ${winTop8 >= 99 ? "almost 100%" : `${winTop8}%`} chance with a win and still ${lossTop8}% with a loss`,
        );
      } else if (winTop8 > 10 || lossTop8 > 10) {
        confParts.push(
          `top 8 seed: ${winTop8}% with a win, ${lossTop8}% with a loss`,
        );
      }

      // Average seed
      const winSeed = win.avg_seed;
      const lossSeed = loss.avg_seed;
      confParts.push(
        `on average would expect to be around a ${winSeed.toFixed(0)} seed with a win and a ${lossSeed.toFixed(0)} seed with a loss`,
      );

      if (confParts.length > 0) {
        parts.push(
          `${team} — For the conference tournament, ${confParts.join(". ")}.`,
        );
      }

      // NCAA Tournament impact
      const ncaaParts: string[] = [];
      const winBid = win.tournament_bid_pct ?? null;
      const lossBid = loss.tournament_bid_pct ?? null;
      const winNcaaSeed = win.average_seed ?? null;
      const lossNcaaSeed = loss.average_seed ?? null;

      if (winBid !== null && lossBid !== null) {
        if (winBid >= 95 && lossBid >= 95) {
          ncaaParts.push(`they should be in the tournament with a win or loss`);
        } else if (winBid >= 95 && lossBid >= 70) {
          ncaaParts.push(
            `they should be in with a win, and still likely with a loss at ${lossBid.toFixed(0)}%`,
          );
        } else if (winBid >= 70 && lossBid < 50) {
          ncaaParts.push(
            `a win would put them in a strong position at ${winBid.toFixed(0)}%, but a loss could be troubling at only ${lossBid.toFixed(0)}%`,
          );
        } else if (winBid >= 50 && lossBid < 30) {
          ncaaParts.push(
            `a win keeps them in the hunt at ${winBid.toFixed(0)}%, but a loss could be devastating at ${lossBid.toFixed(0)}%`,
          );
        } else {
          ncaaParts.push(
            `tournament probability: ${winBid.toFixed(0)}% with a win, ${lossBid.toFixed(0)}% with a loss`,
          );
        }
      }

      if (
        winNcaaSeed !== null &&
        lossNcaaSeed !== null &&
        winNcaaSeed > 0 &&
        lossNcaaSeed > 0
      ) {
        const seedDiff = Math.abs(winNcaaSeed - lossNcaaSeed);
        if (seedDiff < 0.5) {
          ncaaParts.push(
            `projected around a ${winNcaaSeed.toFixed(0)} seed either way`,
          );
        } else {
          // Determine seed range based on average seed value
          const winSeedLow = Math.floor(winNcaaSeed);
          const winSeedHigh = Math.ceil(winNcaaSeed);
          const lossSeedLow = Math.floor(lossNcaaSeed);
          const lossSeedHigh = Math.ceil(lossNcaaSeed);

          let winDesc = `${ordinal(winSeedLow)}`;
          if (winSeedLow !== winSeedHigh) {
            winDesc = `between a ${ordinal(winSeedLow)} and ${ordinal(winSeedHigh)} seed`;
          } else {
            winDesc = `a ${ordinal(winSeedLow)} seed`;
          }

          let lossDesc = `${ordinal(lossSeedLow)}`;
          if (lossSeedLow !== lossSeedHigh) {
            lossDesc = `a ${ordinal(lossSeedLow)} to ${ordinal(lossSeedHigh)} seed`;
          } else {
            lossDesc = `a ${ordinal(lossSeedLow)} seed`;
          }

          ncaaParts.push(
            `with a win ${winDesc} is expected and with a loss ${lossDesc} is expected`,
          );
        }
      }

      if (ncaaParts.length > 0) {
        parts.push(`For the NCAA Tournament, ${ncaaParts.join(". But, ")}.`);
      }
    } else {
      // Fallback when impact data not available
      const bidPct = info.tournament_bid_pct;
      const avgSeed = info.average_seed;
      if (bidPct !== undefined) {
        if (bidPct >= 95)
          parts.push(
            `${team} — Should be in the tournament regardless of outcome.`,
          );
        else if (bidPct >= 50)
          parts.push(
            `${team} — On the bubble at ${bidPct.toFixed(0)}% tournament probability. This game matters.`,
          );
        else
          parts.push(
            `${team} — At ${bidPct.toFixed(0)}% tournament probability, they need wins.`,
          );
      }
      if (avgSeed && avgSeed > 0)
        parts.push(`Currently projected as a ${avgSeed.toFixed(1)} seed.`);
      parts.push("Impact data loading...");
    }

    return parts.join(" ");
  };

  return `${teamParagraph(awayTeam, awayInfo, awayImpact)}\n\n${teamParagraph(homeTeam, homeInfo, homeImpact)}`;
}

function buildWinValuesNarrative(
  awayTeam: string,
  homeTeam: string,
  awaySchedule: TeamGameData[],
  homeSchedule: TeamGameData[],
): string {
  const teamParagraph = (team: string, schedule: TeamGameData[]) => {
    const completed = schedule.filter(
      (g) => g.status === "W" || g.status === "L",
    );
    if (completed.length === 0) return `${team}: No completed games yet.`;

    const latestTwv = completed[completed.length - 1].twv ?? null;
    const confGames = completed.filter(
      (g) => g.cwv !== undefined && g.cwv !== null,
    );
    const latestCwv =
      confGames.length > 0
        ? (confGames[confGames.length - 1].cwv ?? null)
        : null;

    const parts: string[] = [];

    // TWV analysis with trend
    if (latestTwv !== null) {
      const twvSign = latestTwv >= 0 ? "+" : "";
      let twvDesc: string;
      if (latestTwv >= 3)
        twvDesc = `TWV is very strong at ${twvSign}${latestTwv.toFixed(1)}`;
      else if (latestTwv >= 1.5)
        twvDesc = `TWV is strong at ${twvSign}${latestTwv.toFixed(1)}`;
      else if (latestTwv >= 0.5)
        twvDesc = `TWV is a little above what would be expected by the 30th rated team, at ${twvSign}${latestTwv.toFixed(1)}`;
      else if (latestTwv > -0.5)
        twvDesc = `TWV is roughly in line with what the 30th rated team would expect, at ${twvSign}${latestTwv.toFixed(1)}`;
      else if (latestTwv > -1.5)
        twvDesc = `TWV is a bit below expectations at ${latestTwv.toFixed(1)}`;
      else
        twvDesc = `TWV is well below expectations at ${latestTwv.toFixed(1)}`;

      // Find TWV peak and trough for trend
      const twvValues = completed
        .filter((g) => g.twv !== undefined && g.twv !== null)
        .map((g) => g.twv!);
      if (twvValues.length > 3) {
        const maxTwv = Math.max(...twvValues);
        const minTwv = Math.min(...twvValues);
        if (Math.abs(latestTwv - maxTwv) < 0.3) {
          twvDesc += " and is near the highest point reached this season";
        } else if (Math.abs(latestTwv - minTwv) < 0.3) {
          twvDesc += " and is near the lowest point of the season";
        } else if (latestTwv > twvValues[Math.floor(twvValues.length / 2)]) {
          twvDesc += " and is trending upward";
        } else {
          twvDesc += ` — down from a peak of ${maxTwv > 0 ? "+" : ""}${maxTwv.toFixed(1)}`;
        }
      }
      parts.push(`${team}: ${twvDesc}.`);
    }

    // CWV analysis with trend
    if (latestCwv !== null) {
      const cwvSign = latestCwv >= 0 ? "+" : "";
      let cwvDesc: string;
      if (latestCwv >= 2)
        cwvDesc = `CWV is very strong at ${cwvSign}${latestCwv.toFixed(1)}`;
      else if (latestCwv >= 1)
        cwvDesc = `CWV is strong at ${cwvSign}${latestCwv.toFixed(1)}`;
      else if (latestCwv >= 0.3)
        cwvDesc = `CWV is okay at ${cwvSign}${latestCwv.toFixed(1)}`;
      else if (latestCwv > -0.3)
        cwvDesc = `CWV is about average vs a .500 conference team at ${cwvSign}${latestCwv.toFixed(1)}`;
      else if (latestCwv > -1)
        cwvDesc = `CWV is a bit below average at ${latestCwv.toFixed(1)}`;
      else
        cwvDesc = `CWV is struggling at ${latestCwv.toFixed(1)} vs a .500 conference team`;

      const cwvValues = confGames.map((g) => g.cwv!);
      if (cwvValues.length > 3) {
        const maxCwv = Math.max(...cwvValues);
        if (Math.abs(latestCwv - maxCwv) < 0.3) {
          cwvDesc += " and near the season high";
        }
      }
      parts.push(cwvDesc + ".");
    }

    return parts.join(" ");
  };

  return `${teamParagraph(awayTeam, awaySchedule)}\n\n${teamParagraph(homeTeam, homeSchedule)}`;
}

function buildScheduleDifficultyNarrative(
  awayTeam: string,
  homeTeam: string,
  awaySchedule: TeamGameData[],
  homeSchedule: TeamGameData[],
): string {
  const teamParagraph = (team: string, schedule: TeamGameData[]) => {
    const completed = schedule.filter(
      (g) => g.status === "W" || g.status === "L",
    );
    const wins = completed.filter((g) => g.status === "W");
    const losses = completed.filter((g) => g.status === "L");
    const totalGames = completed.length;
    if (totalGames === 0) return `${team}: No completed games yet.`;

    const actualWinPct = Math.round((wins.length / totalGames) * 100);

    // Expected wins based on kenpom_win_prob (30th rated team) over ALL completed games
    const withProb = completed.filter(
      (g) => g.kenpom_win_prob !== undefined && g.kenpom_win_prob !== null,
    );
    const expectedWins = withProb.reduce(
      (sum, g) => sum + (g.kenpom_win_prob ?? 0),
      0,
    );
    const expectedWinPct =
      withProb.length > 0
        ? Math.round((expectedWins / withProb.length) * 100)
        : null;
    const twv = wins.length - expectedWins;

    const parts: string[] = [];
    parts.push(
      `At a ${wins.length}-${losses.length} record ${team} has won ${actualWinPct}% of their games.`,
    );

    if (expectedWinPct !== null) {
      parts.push(
        `The 30th rated team would have expected ${expectedWins.toFixed(1)} wins for a ${expectedWinPct}% win percent — putting their TWV at ${twv >= 0 ? "+" : ""}${twv.toFixed(1)}.`,
      );
    }

    // Top wins — use kenpom_win_prob (30th rated team win probability)
    const qualityWins = wins
      .filter(
        (g) =>
          g.kenpom_rank &&
          g.kenpom_rank !== 999 &&
          g.kenpom_win_prob !== undefined,
      )
      .sort((a, b) => (a.kenpom_win_prob ?? 1) - (b.kenpom_win_prob ?? 1));
    if (qualityWins.length > 0) {
      const topWins = qualityWins.slice(0, 3).map((g, i) => {
        const prob =
          g.kenpom_win_prob !== undefined
            ? Math.round((g.kenpom_win_prob ?? 0) * 100)
            : null;
        return `${g.opponent}${prob !== null ? ` (${prob}%${i === 0 ? " win probability for 30th rated team" : " probability"})` : ""}`;
      });
      parts.push(`Top wins include ${joinWithAnd(topWins)}.`);
    }

    // Worst losses — use kenpom_win_prob
    const badLosses = losses
      .filter(
        (g) =>
          g.kenpom_rank &&
          g.kenpom_rank !== 999 &&
          g.kenpom_win_prob !== undefined,
      )
      .sort((a, b) => (b.kenpom_win_prob ?? 0) - (a.kenpom_win_prob ?? 0));
    if (badLosses.length > 0) {
      const worstLosses = badLosses.slice(0, 3).map((g) => {
        const prob =
          g.kenpom_win_prob !== undefined
            ? Math.round((g.kenpom_win_prob ?? 0) * 100)
            : null;
        return `${g.opponent}${prob !== null ? ` (${prob}% probability)` : ""}`;
      });
      parts.push(`Worst losses include ${joinWithAnd(worstLosses)}.`);
    }

    return parts.join(" ");
  };

  return `${teamParagraph(awayTeam, awaySchedule)}\n\n${teamParagraph(homeTeam, homeSchedule)}`;
}

function buildWinsBreakdownNarrative(
  awayTeam: string,
  homeTeam: string,
  awaySchedule: TeamGameData[],
  homeSchedule: TeamGameData[],
  awayInfo?: TeamInfo,
  homeInfo?: TeamInfo,
  awayConfChampData?: ConfChampData | null,
  homeConfChampData?: ConfChampData | null,
): string {
  const teamParagraph = (
    team: string,
    schedule: TeamGameData[],
    info?: TeamInfo,
    opponent?: string,
    confChampData?: ConfChampData | null,
  ) => {
    const completed = schedule.filter(
      (g) => g.status === "W" || g.status === "L",
    );
    const currentWins = completed.filter((g) => g.status === "W").length;
    const remaining = schedule.filter(
      (g) => g.status !== "W" && g.status !== "L",
    );
    const parts: string[] = [];
    // Projected wins from win_seed_counts (weighted average — matches Proj Final Record)
    let projectedWinsExact: number | null = null;
    if (info && info.win_seed_counts && info.win_seed_counts.length > 0) {
      const wsc = info.win_seed_counts;
      const totalCount = wsc.reduce((sum, e) => sum + e.Count, 0);
      if (totalCount > 0) {
        projectedWinsExact =
          wsc.reduce((sum, e) => sum + e.Wins * e.Count, 0) / totalCount;
      }
    }

    // Fallback: compute from team_win_prob if win_seed_counts unavailable
    if (projectedWinsExact === null) {
      const remainingWithProb = remaining.filter(
        (g) => g.team_win_prob !== undefined && g.team_win_prob !== null,
      );
      const remainingExpectedWins = remainingWithProb.reduce(
        (sum, g) => sum + (g.team_win_prob ?? 0),
        0,
      );
      projectedWinsExact = currentWins + remainingExpectedWins;
    }

    const projLow = Math.floor(projectedWinsExact);
    const projHigh = Math.ceil(projectedWinsExact);
    const frac = projectedWinsExact - projLow;

    // Use tournament_bid_pct to decide if we should show seed or "out of tournament"
    const bidPct = info?.tournament_bid_pct;
    const avgSeed = info?.average_seed;
    let seedStr = "";
    if (bidPct !== undefined && bidPct < 50) {
      // Team is more likely OUT of the tournament — don't show misleading seed
    } else if (avgSeed && avgSeed > 0) {
      seedStr = ` which would put them at around a ${avgSeed.toFixed(0)} seed`;
    }

    if (projLow === projHigh) {
      parts.push(
        `${team} is projected to finish with around ${projLow} wins${seedStr}.`,
      );
    } else if (frac <= 0.2) {
      parts.push(
        `${team} is projected to finish with around ${projLow} wins${seedStr}.`,
      );
    } else if (frac >= 0.8) {
      parts.push(
        `${team} is projected to finish with around ${projHigh} wins${seedStr}.`,
      );
    } else {
      parts.push(
        `${team} is projected to finish with between ${projLow} and ${projHigh} wins${seedStr}.`,
      );
    }

    // Determine total remaining games including conference tournament
    let totalRemainingCount = remaining.length;
    if (info && info.win_seed_counts && info.win_seed_counts.length > 0) {
      const maxWinsInDist = Math.max(
        ...info.win_seed_counts.map((e) => e.Wins),
      );
      const impliedTotalRemaining = maxWinsInDist - currentWins;
      if (impliedTotalRemaining > totalRemainingCount) {
        totalRemainingCount = impliedTotalRemaining;
      }
    }

    // ─── Rank this game among ALL remaining games (regular + conf tourney) ───
    // Build the same combined+sorted list the chart (BasketballTeamWinsBreakdown) uses:
    // scheduled remaining games + conference tournament games, sorted by win prob descending.
    if (totalRemainingCount > 0 && opponent) {
      // Scheduled remaining games with win probs
      const scheduledRemaining = remaining
        .filter(
          (g) => g.team_win_prob !== undefined && g.team_win_prob !== null,
        )
        .map((g) => ({
          opponent: g.opponent,
          winProb: g.team_win_prob ?? 0,
          isConfTourney: false,
        }));

      // Build conference tournament games from ACTUAL confChampData
      // (same data source the chart component uses)
      const confTourneyGames: {
        opponent: string;
        winProb: number;
        isConfTourney: boolean;
      }[] = [];
      if (confChampData) {
        for (let gameNum = 1; gameNum <= 6; gameNum++) {
          const probKey =
            `pct_prob_win_conf_tourney_game_${gameNum}` as keyof ConfChampData;
          const prob = (confChampData[probKey] as number) || 0;
          if (prob > 0) {
            confTourneyGames.push({
              opponent: `Conf Tourney Game ${gameNum}`,
              winProb: prob / 100, // API returns percentage, convert to decimal
              isConfTourney: true,
            });
          }
        }
      }

      // Combine and sort all remaining games by win prob descending (easiest first)
      // This exactly matches the chart's ordering
      const allRemaining = [...scheduledRemaining, ...confTourneyGames].sort(
        (a, b) => b.winProb - a.winProb,
      );

      // Find this game's position in the combined sorted list
      const gameIdx = allRemaining.findIndex(
        (g) => !g.isConfTourney && g.opponent === opponent,
      );

      if (gameIdx >= 0) {
        const easeRank = gameIdx + 1; // 1 = most likely to win
        const totalRemaining = allRemaining.length;

        // Compare to projected remaining wins to contextualize
        const projectedRemainingWins =
          projectedWinsExact !== null ? projectedWinsExact - currentWins : null;
        const likelyInProjection =
          projectedRemainingWins !== null &&
          easeRank <= Math.round(projectedRemainingWins);

        const rankLabel = easeRank === 1 ? "most" : ordinal(easeRank) + " most";

        if (likelyInProjection) {
          parts.push(
            `This is the ${rankLabel} likely of their up to ${totalRemaining} remaining games that they would win and is one of the more likely games they would win if they achieve their projected total.`,
          );
        } else if (
          projectedRemainingWins !== null &&
          easeRank > Math.round(projectedRemainingWins)
        ) {
          parts.push(
            `This is the ${rankLabel} likely of their up to ${totalRemaining} projected remaining games that they would win and a win here positions them to exceed their current projected win total.`,
          );
        } else {
          parts.push(
            `This is the ${rankLabel} likely of their up to ${totalRemaining} projected remaining games that they would win.`,
          );
        }
      } else {
        parts.push(
          `They have up to ${totalRemainingCount} game${totalRemainingCount !== 1 ? "s" : ""} remaining.`,
        );
      }
    } else if (totalRemainingCount > 0) {
      parts.push(
        `They have up to ${totalRemainingCount} game${totalRemainingCount !== 1 ? "s" : ""} remaining.`,
      );
    }

    // Seed range and no-more-wins from win_seed_counts
    if (info && info.win_seed_counts && info.win_seed_counts.length > 0) {
      const wsc = info.win_seed_counts;
      const withSeeds = wsc.filter(
        (e) => e.Seed && e.Seed !== "Out" && e.Seed !== "None" && e.Count > 0,
      );
      const seeds = withSeeds
        .map((e) => parseInt(String(e.Seed)))
        .filter((n) => !isNaN(n));

      const currentWinEntry = wsc.find((e) => e.Wins === currentWins);
      const noMoreSeed = currentWinEntry?.Seed;
      const noMoreIsOut =
        !noMoreSeed || noMoreSeed === "Out" || noMoreSeed === "None";

      if (seeds.length > 0) {
        const bestSeed = Math.min(...seeds);
        parts.push(
          `Top end seed possibility looks to be around a ${bestSeed} seed`,
        );
        if (noMoreIsOut) {
          parts.push(
            `and with no more wins they would project to be out of the tournament.`,
          );
        } else {
          parts.push(
            `and with no more wins they would project as around a ${noMoreSeed} seed.`,
          );
        }
      } else if (currentWinEntry) {
        if (noMoreIsOut) {
          parts.push(
            `With no more wins they would project to be out of the tournament.`,
          );
        } else {
          parts.push(
            `With no more wins they would project as around a ${noMoreSeed} seed.`,
          );
        }
      }
    }

    return parts.join(" ");
  };
  return `${teamParagraph(awayTeam, awaySchedule, awayInfo, homeTeam, awayConfChampData)}\n\n${teamParagraph(homeTeam, homeSchedule, homeInfo, awayTeam, homeConfChampData)}`;
}

const sectionDescStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  lineHeight: 1.5,
  marginBottom: 10,
  marginTop: 2,
};

// ─── 3-Column Schedule Strip (Away | Neutral | Home) ─────────────────────────

function ThreeColumnSchedule({
  schedule,
  upcomingOpponent,
  upcomingDate,
}: {
  schedule: TeamGameData[];
  upcomingOpponent: string;
  upcomingDate: string;
}) {
  const nextGame = (() => {
    const chronoNext = [...schedule]
      .sort((a, b) => a.date.localeCompare(b.date))
      .find((g) => g.status !== "W" && g.status !== "L");
    if (chronoNext) return chronoNext;
    if (upcomingOpponent && upcomingDate) {
      return (
        schedule.find(
          (g) => g.opponent === upcomingOpponent && g.date === upcomingDate,
        ) || null
      );
    }
    return null;
  })();

  const grouped = {
    Away: [] as TeamGameData[],
    Neutral: [] as TeamGameData[],
    Home: [] as TeamGameData[],
  };
  const records = {
    Away: { w: 0, l: 0 },
    Neutral: { w: 0, l: 0 },
    Home: { w: 0, l: 0 },
  };

  schedule.forEach((g) => {
    const loc = g.location as "Away" | "Neutral" | "Home";
    if (grouped[loc]) {
      grouped[loc].push(g);
      if (g.status === "W") records[loc].w++;
      else if (g.status === "L") records[loc].l++;
    }
  });

  (["Away", "Neutral", "Home"] as const).forEach((loc) => {
    grouped[loc].sort((a, b) => {
      const aRank =
        !a.kenpom_rank || a.kenpom_rank === 999 ? 9999 : a.kenpom_rank;
      const bRank =
        !b.kenpom_rank || b.kenpom_rank === 999 ? 9999 : b.kenpom_rank;
      return aRank - bRank;
    });
  });

  const BOX_W = 42;
  const BOX_H = 24;
  const LOGO_SIZE = 14;

  const isNextGame = (g: TeamGameData) => {
    if (!nextGame) return false;
    return g.opponent === nextGame.opponent && g.date === nextGame.date;
  };

  const getBorderColor = (g: TeamGameData) => {
    if (isNextGame(g)) return TEAL;
    if (g.status === "W") return "#22c55e";
    if (g.status === "L") return "#ef4444";
    return "#d1d5db";
  };

  const getBgColor = (g: TeamGameData) => {
    if (isNextGame(g)) return `${TEAL}25`;
    return "white";
  };

  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
      {(["Away", "Neutral", "Home"] as const).map((loc) => (
        <div key={loc} style={{ flexShrink: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 3 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#6b7280" }}>
              {loc}
            </div>
            <div style={{ fontSize: 8, color: "#9ca3af" }}>
              {records[loc].w}-{records[loc].l}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              alignItems: "center",
            }}
          >
            {grouped[loc].length > 0 ? (
              grouped[loc].map((g, idx) => {
                const nextGameMatch = isNextGame(g);
                return (
                  <div
                    key={`${g.date}-${g.opponent}-${idx}`}
                    title={`${g.opponent} ${g.kenpom_rank && g.kenpom_rank !== 999 ? `#${g.kenpom_rank}` : "Non D1"} - ${g.status === "W" ? "Win" : g.status === "L" ? "Loss" : "Upcoming"}`}
                    style={{
                      width: BOX_W,
                      height: BOX_H,
                      border: `2px solid ${getBorderColor(g)}`,
                      borderRadius: 3,
                      backgroundColor: getBgColor(g),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 2px",
                      boxShadow: nextGameMatch ? `0 0 0 1px ${TEAL}40` : "none",
                    }}
                  >
                    {g.opponent_logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getLogoUrl(g.opponent_logo)}
                        alt={g.opponent}
                        style={{
                          width: LOGO_SIZE,
                          height: LOGO_SIZE,
                          objectFit: "contain",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src="/images/team_logos/default.png"
                        alt={g.opponent}
                        style={{
                          width: LOGO_SIZE,
                          height: LOGO_SIZE,
                          objectFit: "contain",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 7,
                        color: "#6b7280",
                        fontWeight: 600,
                        marginLeft: 1,
                        flexShrink: 0,
                      }}
                    >
                      {g.kenpom_rank && g.kenpom_rank !== 999
                        ? `#${g.kenpom_rank}`
                        : "Non D1"}
                    </span>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  width: BOX_W,
                  height: BOX_H,
                  border: "1px dashed #d1d5db",
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                  color: "#9ca3af",
                }}
              >
                None
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Next Game Impact Inline Component ───────────────────────────────────────

function NextGameImpactInline({
  teamInfo,
  impactData: externalImpactData,
}: {
  teamId: string;
  conference: string;
  teamInfo: TeamInfo;
  impactData?: NextGameImpactData | null;
}) {
  // Use pre-fetched data from parent
  const impactData = externalImpactData ?? null;

  if (!impactData) {
    return (
      <div className="flex items-center justify-center py-4">
        <div
          className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: `${TEAL} transparent transparent transparent` }}
        />
        <span className="text-xs text-gray-400 ml-2">
          Calculating impact...
        </span>
      </div>
    );
  }
  if (impactData.error || !impactData.game) return null;

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
  const COL_DATA = { minWidth: "50px", width: "50px" };

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
      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-200">
        <TeamLogo
          logoUrl={teamInfo.logo_url || ""}
          teamName={teamInfo.team_name}
          size={16}
        />
        <span className="text-xs font-medium text-gray-700">
          {teamInfo.team_name}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 mb-2 py-1 bg-gray-50 rounded">
        <div className="flex items-center gap-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getLogoUrl(game.away_team_logo)}
            alt={game.away_team}
            className="w-4 h-4 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-[10px] font-medium">{game.away_team}</span>
        </div>
        <span className="text-[9px] text-gray-400">@</span>
        <div className="flex items-center gap-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getLogoUrl(game.home_team_logo)}
            alt={game.home_team}
            className="w-4 h-4 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-[10px] font-medium">{game.home_team}</span>
        </div>
        <span className="text-[8px] text-gray-400 ml-1">{game.date}</span>
      </div>

      <h4 className="text-xs font-medium mb-1.5">
        Conference Tournament Probabilities
      </h4>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="text-left py-1 px-1 font-normal" style={COL_METRIC}>
              Metric
            </th>
            <th className="text-center py-1 px-1 font-normal" style={COL_DATA}>
              Current
            </th>
            <th
              className="text-center py-1 px-1 font-normal"
              style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
            >
              Win
            </th>
            <th
              className="text-center py-1 px-1 font-normal"
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
                <td className="py-1 px-1 text-xs">{label}</td>
                <td
                  className="text-center py-1 px-1 tabular-nums"
                  style={isPercent ? getCellColor(cur, "blue") : undefined}
                >
                  {isPercent
                    ? cur > 0
                      ? `${cur.toFixed(1)}%`
                      : ""
                    : cur.toFixed(1)}
                </td>
                <td
                  className="text-center py-1 px-1 tabular-nums"
                  style={isPercent ? getCellColor(win, "blue") : undefined}
                >
                  {isPercent
                    ? win > 0
                      ? `${win.toFixed(1)}%`
                      : ""
                    : win.toFixed(1)}
                </td>
                <td
                  className="text-center py-1 px-1 tabular-nums"
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

      <div className="mt-2">
        <h4 className="text-xs font-medium mb-1.5">Seed Probabilities</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th
                className="text-left py-1 px-1 font-normal"
                style={COL_METRIC}
              >
                Seed
              </th>
              <th
                className="text-center py-1 px-1 font-normal"
                style={COL_DATA}
              >
                Current
              </th>
              <th
                className="text-center py-1 px-1 font-normal"
                style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
              >
                Win
              </th>
              <th
                className="text-center py-1 px-1 font-normal"
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
                  <td className="py-1 px-1 text-xs">{ordinal(seed)}</td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
                    style={getCellColor(cur, "blue")}
                  >
                    {cur > 0 ? `${cur.toFixed(1)}%` : ""}
                  </td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
                    style={getCellColor(win, "blue")}
                  >
                    {win > 0 ? `${win.toFixed(1)}%` : ""}
                  </td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
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

      <div className="my-3 border-t border-gray-300" />

      <h4 className="text-xs font-semibold mb-1">
        NCAA Tournament Probabilities
      </h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="text-left py-1 px-1 font-normal" style={COL_METRIC}>
              Metric
            </th>
            <th className="text-center py-1 px-1 font-normal" style={COL_DATA}>
              Current
            </th>
            <th
              className="text-center py-1 px-1 font-normal"
              style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
            >
              Win
            </th>
            <th
              className="text-center py-1 px-1 font-normal"
              style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}
            >
              Loss
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="py-1 px-1 text-xs">In Tourney Prob</td>
            <td
              className="text-center py-1 px-1 tabular-nums"
              style={getCellColor(
                (teamMetrics.tournament_bid_pct as number) ?? 0,
                "blue",
              )}
            >
              {((teamMetrics.tournament_bid_pct as number) ?? 0) > 0
                ? `${((teamMetrics.tournament_bid_pct as number) ?? 0).toFixed(1)}%`
                : ""}
            </td>
            <td
              className="text-center py-1 px-1 tabular-nums"
              style={getCellColor(
                (winMetrics.tournament_bid_pct as number) ?? 0,
                "blue",
              )}
            >
              {((winMetrics.tournament_bid_pct as number) ?? 0) > 0
                ? `${((winMetrics.tournament_bid_pct as number) ?? 0).toFixed(1)}%`
                : ""}
            </td>
            <td
              className="text-center py-1 px-1 tabular-nums"
              style={getCellColor(
                (lossMetrics.tournament_bid_pct as number) ?? 0,
                "blue",
              )}
            >
              {((lossMetrics.tournament_bid_pct as number) ?? 0) > 0
                ? `${((lossMetrics.tournament_bid_pct as number) ?? 0).toFixed(1)}%`
                : ""}
            </td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-1 px-1 text-xs">Avg NCAA Seed</td>
            <td className="text-center py-1 px-1 tabular-nums">
              {teamMetrics.average_seed != null &&
              (teamMetrics.average_seed as number) > 0
                ? (teamMetrics.average_seed as number).toFixed(1)
                : "\u2014"}
            </td>
            <td className="text-center py-1 px-1 tabular-nums">
              {winMetrics.average_seed != null &&
              (winMetrics.average_seed as number) > 0
                ? (winMetrics.average_seed as number).toFixed(1)
                : "\u2014"}
            </td>
            <td className="text-center py-1 px-1 tabular-nums">
              {lossMetrics.average_seed != null &&
              (lossMetrics.average_seed as number) > 0
                ? (lossMetrics.average_seed as number).toFixed(1)
                : "\u2014"}
            </td>
          </tr>
        </tbody>
      </table>

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
          <div className="mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th
                    className="text-left py-1 px-1 font-normal"
                    style={COL_METRIC}
                  >
                    Seed
                  </th>
                  <th
                    className="text-center py-1 px-1 font-normal"
                    style={COL_DATA}
                  >
                    Current
                  </th>
                  <th
                    className="text-center py-1 px-1 font-normal"
                    style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
                  >
                    Win
                  </th>
                  <th
                    className="text-center py-1 px-1 font-normal"
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
                      <td className="py-1 px-1">{seed}</td>
                      <td
                        className="text-center py-1 px-1 tabular-nums"
                        style={getCellColor(c, "blue")}
                      >
                        {c > 0 ? `${c.toFixed(1)}%` : ""}
                      </td>
                      <td
                        className="text-center py-1 px-1 tabular-nums"
                        style={getCellColor(w, "blue")}
                      >
                        {w > 0 ? `${w.toFixed(1)}%` : ""}
                      </td>
                      <td
                        className="text-center py-1 px-1 tabular-nums"
                        style={getCellColor(l, "blue")}
                      >
                        {l > 0 ? `${l.toFixed(1)}%` : ""}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-b border-gray-100">
                  <td className="py-1 px-1 text-gray-500 italic text-[10px]">
                    Out
                  </td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
                    style={getCellColor(curOut, "yellow")}
                  >
                    {curOut > 0.05 ? `${curOut.toFixed(1)}%` : ""}
                  </td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
                    style={getCellColor(winOut, "yellow")}
                  >
                    {winOut > 0.05 ? `${winOut.toFixed(1)}%` : ""}
                  </td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
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

      <p className="text-[8px] text-gray-400 leading-relaxed mt-2 pt-1 border-t border-gray-100">
        Shows projected impact of the team&apos;s next scheduled conference game
        on conference and NCAA tournament probabilities. Win and Loss columns
        show how probabilities change if the team wins or loses that game.
      </p>
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
  winProb,
}: {
  awayTeam: string;
  homeTeam: string;
  awayMetrics: ComputedMetrics;
  homeMetrics: ComputedMetrics;
  awayInfo: TeamInfo;
  homeInfo: TeamInfo;
  winProb: number | null;
}) {
  const homeWinPct =
    winProb !== null ? (winProb > 1 ? winProb : winProb * 100) : null;
  const awayWinPct = homeWinPct !== null ? 100 - homeWinPct : null;

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
      label: "Conf Record",
      awayValue: awayMetrics.conferenceRecord,
      homeValue: homeMetrics.conferenceRecord,
    },
    {
      label: "Conf Position",
      awayValue: awayMetrics.confPosition,
      homeValue: homeMetrics.confPosition,
    },
    {
      label: "Composite Rating",
      awayValue: awayMetrics.kenpomRank ? `#${awayMetrics.kenpomRank}` : "N/A",
      homeValue: homeMetrics.kenpomRank ? `#${homeMetrics.kenpomRank}` : "N/A",
    },
    {
      label: "Win Probability",
      awayValue: awayWinPct !== null ? `${Math.round(awayWinPct)}%` : "N/A",
      homeValue: homeWinPct !== null ? `${Math.round(homeWinPct)}%` : "N/A",
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
    return "#6b7280";
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
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 8px",
            gap: 6,
            backgroundColor: awayInfo.primary_color
              ? `${awayInfo.primary_color}0D`
              : "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <TeamLogo
            logoUrl={awayInfo.logo_url || ""}
            teamName={awayTeam}
            size={28}
          />
          <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>
            {awayTeam}
          </span>
        </div>
        <div
          style={{
            padding: "4px 10px",
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 110,
          }}
        >
          <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>
            @
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 8px",
            gap: 6,
            backgroundColor: homeInfo.primary_color
              ? `${homeInfo.primary_color}0D`
              : "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <TeamLogo
            logoUrl={homeInfo.logo_url || ""}
            teamName={homeTeam}
            size={28}
          />
          <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>
            {homeTeam}
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
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "7px 8px",
              fontWeight: 400,
              fontSize: 13,
              color: m.isStreak ? streakColor(m.awayValue) : "#6b7280",
              backgroundColor: idx % 2 === 0 ? "white" : "#fafbfc",
            }}
          >
            {m.awayValue}
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "7px 10px",
              fontSize: 11,
              color: "#9ca3af",
              fontWeight: 500,
              minWidth: 110,
              borderLeft: "1px solid #f3f4f6",
              borderRight: "1px solid #f3f4f6",
              backgroundColor: "white",
            }}
          >
            {m.label}
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "7px 8px",
              fontWeight: 400,
              fontSize: 13,
              color: m.isStreak ? streakColor(m.homeValue) : "#6b7280",
              backgroundColor: idx % 2 === 0 ? "white" : "#fafbfc",
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
  pdfContainerRef: React.RefObject<HTMLDivElement | null>,
  gameName: string,
) {
  if (!pdfContainerRef.current) return;
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
    addPage: () => void;
    save: (filename: string) => void;
  }
  const jspdfModule = (window as unknown as Record<string, unknown>).jspdf as {
    jsPDF: new (options: {
      orientation: string;
      unit: string;
      format: string;
      compress?: boolean;
    }) => JsPDFInstance;
  };
  if (!jspdfModule) return;

  const pages = Array.from(
    pdfContainerRef.current.querySelectorAll<HTMLElement>("[data-pdf-page]"),
  );
  if (pages.length === 0) return;

  const pdf = new jspdfModule.jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 5;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const renderWidth = 1100;

  // Helper: convert image URL to base64
  async function toBase64(url: string): Promise<string | null> {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = url;
        setTimeout(reject, 3000);
      });
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return c.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  // 1. Temporarily fix overflow on ALL elements in the container
  const overflowEls: { el: HTMLElement; orig: string }[] = [];
  pdfContainerRef.current.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const style = window.getComputedStyle(el);
    if (
      style.overflowX === "auto" ||
      style.overflowX === "hidden" ||
      style.overflowX === "scroll" ||
      style.overflowY === "auto" ||
      style.overflowY === "hidden" ||
      style.overflowY === "scroll" ||
      style.overflow === "hidden"
    ) {
      overflowEls.push({
        el,
        orig:
          el.style.overflow +
          "|" +
          el.style.overflowX +
          "|" +
          el.style.overflowY,
      });
      el.style.overflow = "visible";
      el.style.overflowX = "visible";
      el.style.overflowY = "visible";
    }
  });

  // 2. Convert SVG <image> hrefs to inline base64 (logos inside Wins Breakdown charts)
  const svgImageRestores: {
    el: SVGImageElement;
    origHref: string | null;
    origXlink: string | null;
  }[] = [];
  const svgImages = Array.from(
    pdfContainerRef.current.querySelectorAll("image"),
  );
  await Promise.all(
    svgImages.map(async (svgImg) => {
      const href =
        svgImg.getAttribute("href") ||
        svgImg.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (href && !href.startsWith("data:")) {
        const origHref = svgImg.getAttribute("href");
        const origXlink = svgImg.getAttributeNS(
          "http://www.w3.org/1999/xlink",
          "href",
        );
        const fullUrl = href.startsWith("/")
          ? `${window.location.origin}${href}`
          : href;
        const b64 = await toBase64(fullUrl);
        if (b64) {
          svgImageRestores.push({ el: svgImg, origHref, origXlink });
          svgImg.setAttribute("href", b64);
          svgImg.setAttributeNS(
            "http://www.w3.org/1999/xlink",
            "xlink:href",
            b64,
          );
        }
      }
    }),
  );

  // 2b. Convert <img> inside SVG <foreignObject> to inline base64 (logos inside Schedule Difficulty charts)
  const foreignObjImgRestores: { el: HTMLImageElement; origSrc: string }[] = [];
  const foreignObjects = Array.from(
    pdfContainerRef.current.querySelectorAll("foreignObject img"),
  );
  await Promise.all(
    foreignObjects.map(async (imgEl) => {
      const img = imgEl as HTMLImageElement;
      const src = img.getAttribute("src");
      if (src && !src.startsWith("data:")) {
        const fullUrl = src.startsWith("/")
          ? `${window.location.origin}${src}`
          : src;
        const b64 = await toBase64(fullUrl);
        if (b64) {
          foreignObjImgRestores.push({ el: img, origSrc: src });
          img.src = b64;
        }
      }
    }),
  );

  // 3. Wait for all HTML images to be loaded
  const htmlImages = Array.from(
    pdfContainerRef.current.querySelectorAll("img"),
  );
  await Promise.all(
    htmlImages.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 3000);
      });
    }),
  );

  // Small delay to let everything settle
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 4. Render each page
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();

    const el = pages[i];
    const canvas = await html2canvas(el, {
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: renderWidth,
      width: renderWidth,
      imageTimeout: 5000,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.85);
    const imgRatio = canvas.height / canvas.width;

    let w = usableWidth;
    let h = w * imgRatio;
    if (h > usableHeight) {
      h = usableHeight;
      w = h / imgRatio;
    }
    const x = margin + (usableWidth - w) / 2;
    const y = margin;
    pdf.addImage(imgData, "JPEG", x, y, w, h);
  }

  // 5. Restore SVG image hrefs
  svgImageRestores.forEach(({ el, origHref, origXlink }) => {
    if (origHref !== null) el.setAttribute("href", origHref);
    if (origXlink !== null)
      el.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        origXlink,
      );
  });

  // 5b. Restore foreignObject img src
  foreignObjImgRestores.forEach(({ el, origSrc }) => {
    el.src = origSrc;
  });

  // 6. Restore overflow styles
  overflowEls.forEach(({ el, orig }) => {
    const [ov, ovx, ovy] = orig.split("|");
    el.style.overflow = ov;
    el.style.overflowX = ovx;
    el.style.overflowY = ovy;
  });

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
  const [awayConfStandings, setAwayConfStandings] = useState<
    ConferenceStandingsTeam[]
  >([]);
  const [homeConfStandings, setHomeConfStandings] = useState<
    ConferenceStandingsTeam[]
  >([]);
  const [awayImpactData, setAwayImpactData] =
    useState<NextGameImpactData | null>(null);
  const [homeImpactData, setHomeImpactData] =
    useState<NextGameImpactData | null>(null);
  const [awayConfChampData, setAwayConfChampData] =
    useState<ConfChampData | null>(null);
  const [homeConfChampData, setHomeConfChampData] =
    useState<ConfChampData | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();

  const twoColGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: isMobile ? 12 : 16,
    alignItems: "start",
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
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, []);

  // Auto-select game from URL query parameter
  useEffect(() => {
    if (upcomingGames.length === 0) return;
    const gameParam = searchParams.get("game");
    if (gameParam && !selectedGame) {
      const match = upcomingGames.find((g) => g.game_id === gameParam);
      if (match) {
        setSelectedGame(match);
      }
    }
  }, [upcomingGames, searchParams, selectedGame]);

  // Sync selected game to URL for shareability (only after games have loaded)
  useEffect(() => {
    if (upcomingGames.length === 0) return; // Don't touch URL until games are loaded
    const params = new URLSearchParams(searchParams.toString());
    if (selectedGame) {
      params.set("game", selectedGame.game_id);
    } else {
      params.delete("game");
    }
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [selectedGame, searchParams, upcomingGames]);

  useEffect(() => {
    if (!selectedGame) {
      setAwayTeamData(null);
      setHomeTeamData(null);
      setAwayConfStandings([]);
      setHomeConfStandings([]);
      setAwayImpactData(null);
      setHomeImpactData(null);
      return;
    }
    const loadPreview = async () => {
      setIsLoadingPreview(true);
      setAwayTeamData(null);
      setHomeTeamData(null);
      setAwayConfStandings([]);
      setHomeConfStandings([]);
      setAwayImpactData(null);
      setHomeImpactData(null);
      setAwayConfChampData(null);
      setHomeConfChampData(null);
      setError(null);
      try {
        // Stage 1: Load team data (required for initial render)
        const [awayResp, homeResp] = await Promise.all([
          api.getTeamData(selectedGame.away_team),
          api.getTeamData(selectedGame.home_team),
        ]);
        setAwayTeamData(awayResp as unknown as TeamDataResponse);
        setHomeTeamData(homeResp as unknown as TeamDataResponse);
        setIsLoadingPreview(false);

        // Stage 2: Load standings + impact data in background (non-blocking)
        const awayConf = (awayResp as unknown as TeamDataResponse).team_info
          .conference;
        const homeConf = (homeResp as unknown as TeamDataResponse).team_info
          .conference;
        const awayTeamId = (awayResp as unknown as TeamDataResponse).team_info
          .team_id;
        const homeTeamId = (homeResp as unknown as TeamDataResponse).team_info
          .team_id;

        const fetchImpact = async (
          conf: string,
          teamId: string,
        ): Promise<NextGameImpactData | null> => {
          try {
            const resp = await fetch(
              "/api/proxy/basketball/whatif/next-game-impact",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  conference: conf,
                  team_id: parseInt(teamId),
                }),
              },
            );
            if (!resp.ok) return null;
            return await resp.json();
          } catch {
            return null;
          }
        };

        // Fire all background fetches in parallel
        const [
          awayStandings,
          homeStandings,
          awayImpact,
          homeImpact,
          awayConfChamp,
          homeConfChamp,
        ] = await Promise.all([
          fetchConferenceStandings(awayConf),
          fetchConferenceStandings(homeConf),
          fetchImpact(awayConf, awayTeamId),
          fetchImpact(homeConf, homeTeamId),
          fetchConfChampDataForTeam(
            awayConf,
            (awayResp as unknown as TeamDataResponse).team_info.team_name,
          ),
          fetchConfChampDataForTeam(
            homeConf,
            (homeResp as unknown as TeamDataResponse).team_info.team_name,
          ),
        ]);
        setAwayConfStandings(awayStandings);
        setHomeConfStandings(homeStandings);
        setAwayImpactData(awayImpact);
        setHomeImpactData(homeImpact);
        setAwayConfChampData(awayConfChamp);
        setHomeConfChampData(homeConfChamp);
      } catch (err) {
        console.error("Error loading preview:", err);
        setError("Failed to load team preview data.");
        setIsLoadingPreview(false);
      }
    };
    loadPreview();
  }, [selectedGame]);

  const filteredGames = useMemo(() => {
    // Only show games that are the next game for BOTH participating teams
    let games = upcomingGames.filter((g) => g.is_next_game_for_both);
    if (conferenceFilter !== "All")
      games = games.filter(
        (g) =>
          g.home_team_conference === conferenceFilter ||
          g.away_team_conference === conferenceFilter,
      );
    return games;
  }, [upcomingGames, conferenceFilter]);

  const availableConferences = useMemo(
    () => ["All", ...conferences.filter((c) => c && c !== "FCS")],
    [conferences],
  );

  const awayConfPosition = useMemo(
    () =>
      awayTeamData
        ? computeConfPosition(
            awayTeamData.team_info.team_name,
            awayConfStandings,
          )
        : "—",
    [awayTeamData, awayConfStandings],
  );
  const homeConfPosition = useMemo(
    () =>
      homeTeamData
        ? computeConfPosition(
            homeTeamData.team_info.team_name,
            homeConfStandings,
          )
        : "—",
    [homeTeamData, homeConfStandings],
  );

  const awayMetrics = useMemo(
    () =>
      awayTeamData
        ? computeMetrics(
            awayTeamData.schedule,
            awayTeamData.team_info,
            awayConfPosition,
          )
        : null,
    [awayTeamData, awayConfPosition],
  );
  const homeMetrics = useMemo(
    () =>
      homeTeamData
        ? computeMetrics(
            homeTeamData.schedule,
            homeTeamData.team_info,
            homeConfPosition,
          )
        : null,
    [homeTeamData, homeConfPosition],
  );

  const handlePDF = useCallback(async () => {
    if (!selectedGame) return;
    setIsPdfGenerating(true);
    try {
      await generatePDF(pdfContainerRef, selectedGame.label);
    } finally {
      setIsPdfGenerating(false);
    }
  }, [selectedGame]);

  const selectedGameDate = selectedGame?.date_sort || "";

  return (
    <PageLayoutWrapper title="Game Preview" isLoading={isLoading}>
      <ErrorBoundary>
        <div style={{ maxWidth: 960 }}>
          <p className="text-sm text-gray-500 mb-5">
            Select an upcoming game to view a head-to-head comparison, win/loss
            impact, and schedule analysis.
          </p>

          {error && upcomingGames.length === 0 ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : (
            <>
              {/* Conference + Game Selector (single row) */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 20,
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
                    minWidth: 240,
                  }}
                >
                  <label
                    style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}
                  >
                    Select Game ({filteredGames.length} upcoming)
                  </label>
                  <select
                    value={selectedGame ? selectedGame.game_id : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setSelectedGame(null);
                        return;
                      }
                      setSelectedGame(
                        filteredGames.find((g) => g.game_id === val) || null,
                      );
                    }}
                    style={{
                      padding: "6px 10px",
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
                      <option key={g.game_id} value={g.game_id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Game Preview Content ─────────────────────── */}
              {selectedGame && (
                <>
                  {isLoadingPreview ? (
                    <div style={{ padding: "40px 20px" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        <LoadingSpinner />
                        <span style={{ fontSize: 13, color: "#6b7280" }}>
                          Loading team data...
                        </span>
                      </div>
                      {/* Skeleton preview */}
                      <div style={{ marginTop: 24, opacity: 0.4 }}>
                        <div
                          style={{
                            height: 12,
                            width: "60%",
                            backgroundColor: "#e5e7eb",
                            borderRadius: 4,
                            margin: "0 auto 16px",
                          }}
                        />
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto 1fr",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              height: 120,
                              backgroundColor: "#f3f4f6",
                              borderRadius: 8,
                            }}
                          />
                          <div style={{ fontSize: 11, color: "#d1d5db" }}>
                            @
                          </div>
                          <div
                            style={{
                              height: 120,
                              backgroundColor: "#f3f4f6",
                              borderRadius: 8,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                            marginTop: 16,
                          }}
                        >
                          <div
                            style={{
                              height: 200,
                              backgroundColor: "#f3f4f6",
                              borderRadius: 8,
                            }}
                          />
                          <div
                            style={{
                              height: 200,
                              backgroundColor: "#f3f4f6",
                              borderRadius: 8,
                            }}
                          />
                        </div>
                      </div>
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

                      {/* ═══ All Content (pdfContainerRef wraps everything for PDF) ═══ */}
                      <div ref={pdfContainerRef}>
                        {/* ═══ PDF Page 1: Header + Head-to-Head + Team Narratives ═══ */}
                        <div
                          data-pdf-page="1"
                          style={{
                            backgroundColor: "white",
                            padding: isMobile ? 10 : 20,
                          }}
                        >
                          {/* Header Banner */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                              paddingBottom: 8,
                              borderBottom: "2px solid #e5e7eb",
                            }}
                          >
                            <div>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src="/images/JThom_Logo.png"
                                alt="Logo"
                                style={{ height: 24 }}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#374151",
                                textAlign: "center",
                                flex: 1,
                                padding: "0 12px",
                              }}
                            >
                              Game Preview — {selectedGame.date}
                            </div>
                            <div style={{ fontSize: 10, color: "#9ca3af" }}>
                              {new Date().toLocaleDateString()}
                            </div>
                          </div>

                          {/* 1. Head-to-Head Comparison */}
                          <p style={sectionDescStyle}>
                            {buildHeadToHeadNarrative(
                              selectedGame.away_team,
                              selectedGame.home_team,
                              awayMetrics,
                              homeMetrics,
                              awayTeamData.team_info,
                              homeTeamData.team_info,
                              selectedGame.win_prob,
                            )}
                          </p>
                          <HeadToHeadComparison
                            awayTeam={selectedGame.away_team}
                            homeTeam={selectedGame.home_team}
                            awayMetrics={awayMetrics}
                            homeMetrics={homeMetrics}
                            awayInfo={awayTeamData.team_info}
                            homeInfo={homeTeamData.team_info}
                            winProb={selectedGame.win_prob}
                          />

                          {/* 2. Team Narratives + 3-Column Schedule */}
                          <div style={{ marginTop: 16, ...twoColGrid }}>
                            <div
                              style={{
                                padding: 10,
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
                                  marginBottom: 6,
                                }}
                              >
                                <TeamLogo
                                  logoUrl={
                                    awayTeamData.team_info.logo_url || ""
                                  }
                                  teamName={selectedGame.away_team}
                                  size={18}
                                />
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 12,
                                    color: "#374151",
                                  }}
                                >
                                  {selectedGame.away_team}
                                </span>
                              </div>
                              <p
                                style={{
                                  fontSize: 11,
                                  color: "#4b5563",
                                  lineHeight: 1.55,
                                  margin: "0 0 8px 0",
                                }}
                              >
                                {buildTeamNarrative(
                                  selectedGame.away_team,
                                  awayMetrics,
                                  awayTeamData.team_info,
                                  false,
                                  selectedGame.home_team,
                                  selectedGameDate,
                                  awayTeamData.schedule,
                                )}
                              </p>
                              <div style={{ marginTop: 8 }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#9ca3af",
                                    display: "block",
                                    marginBottom: 3,
                                  }}
                                >
                                  Season Schedule (by difficulty)
                                </span>
                                <ThreeColumnSchedule
                                  schedule={awayTeamData.schedule}
                                  upcomingOpponent={selectedGame.home_team}
                                  upcomingDate={selectedGameDate}
                                />
                              </div>
                            </div>
                            <div
                              style={{
                                padding: 10,
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
                                  marginBottom: 6,
                                }}
                              >
                                <TeamLogo
                                  logoUrl={
                                    homeTeamData.team_info.logo_url || ""
                                  }
                                  teamName={selectedGame.home_team}
                                  size={18}
                                />
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 12,
                                    color: "#374151",
                                  }}
                                >
                                  {selectedGame.home_team}
                                </span>
                              </div>
                              <p
                                style={{
                                  fontSize: 11,
                                  color: "#4b5563",
                                  lineHeight: 1.55,
                                  margin: "0 0 8px 0",
                                }}
                              >
                                {buildTeamNarrative(
                                  selectedGame.home_team,
                                  homeMetrics,
                                  homeTeamData.team_info,
                                  true,
                                  selectedGame.away_team,
                                  selectedGameDate,
                                  homeTeamData.schedule,
                                )}
                              </p>
                              <div style={{ marginTop: 8 }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#9ca3af",
                                    display: "block",
                                    marginBottom: 3,
                                  }}
                                >
                                  Season Schedule (by difficulty)
                                </span>
                                <ThreeColumnSchedule
                                  schedule={homeTeamData.schedule}
                                  upcomingOpponent={selectedGame.away_team}
                                  upcomingDate={selectedGameDate}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ═══ PDF Page 2: Next Game Impact + Win Values ═══ */}
                        <div
                          data-pdf-page="2"
                          style={{
                            backgroundColor: "white",
                            padding: isMobile ? 10 : 20,
                            marginTop: 20,
                          }}
                        >
                          {/* 3. Next Game Win/Loss Impact */}
                          <div>
                            <h3
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#374151",
                                marginBottom: 4,
                                paddingBottom: 5,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Next Game Win/Loss Impact
                            </h3>
                            {(() => {
                              const full = buildNextGameImpactNarrative(
                                selectedGame.away_team,
                                selectedGame.home_team,
                                awayTeamData.team_info,
                                homeTeamData.team_info,
                                awayImpactData,
                                homeImpactData,
                              );
                              const [awayNarr, homeNarr] = full.split("\n\n");
                              const narrStyle: React.CSSProperties = {
                                fontSize: 11,
                                color: "#6b7280",
                                lineHeight: 1.5,
                                marginBottom: 12,
                              };
                              return isMobile ? (
                                <div style={twoColGrid}>
                                  {/* Away Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 10,
                                        backgroundColor: "white",
                                      }}
                                    >
                                      <NextGameImpactInline
                                        teamId={awayTeamData.team_info.team_id}
                                        conference={
                                          awayTeamData.team_info.conference
                                        }
                                        teamInfo={awayTeamData.team_info}
                                        impactData={awayImpactData}
                                      />
                                    </div>
                                  </div>
                                  {/* Home Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{homeNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 10,
                                        backgroundColor: "white",
                                      }}
                                    >
                                      <NextGameImpactInline
                                        teamId={homeTeamData.team_info.team_id}
                                        conference={
                                          homeTeamData.team_info.conference
                                        }
                                        teamInfo={homeTeamData.team_info}
                                        impactData={homeImpactData}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Desktop: Row 1: Paragraphs */}
                                  <div style={twoColGrid}>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <p style={narrStyle}>{homeNarr}</p>
                                  </div>
                                  {/* Desktop: Row 2: Components */}
                                  <div style={twoColGrid}>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 10,
                                        backgroundColor: "white",
                                      }}
                                    >
                                      <NextGameImpactInline
                                        teamId={awayTeamData.team_info.team_id}
                                        conference={
                                          awayTeamData.team_info.conference
                                        }
                                        teamInfo={awayTeamData.team_info}
                                        impactData={awayImpactData}
                                      />
                                    </div>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 10,
                                        backgroundColor: "white",
                                      }}
                                    >
                                      <NextGameImpactInline
                                        teamId={homeTeamData.team_info.team_id}
                                        conference={
                                          homeTeamData.team_info.conference
                                        }
                                        teamInfo={homeTeamData.team_info}
                                        impactData={homeImpactData}
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* 4. Win Values Over Time */}
                          <div style={{ marginTop: 20 }}>
                            <h3
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#374151",
                                marginBottom: 4,
                                paddingBottom: 5,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Win Values Over Time
                            </h3>
                            {(() => {
                              const full = buildWinValuesNarrative(
                                selectedGame.away_team,
                                selectedGame.home_team,
                                awayTeamData.schedule,
                                homeTeamData.schedule,
                              );
                              const [awayNarr, homeNarr] = full.split("\n\n");
                              const narrStyle: React.CSSProperties = {
                                fontSize: 11,
                                color: "#6b7280",
                                lineHeight: 1.5,
                                marginBottom: 12,
                              };
                              return isMobile ? (
                                <div style={twoColGrid}>
                                  {/* Away Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 8,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                        overflowY: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 8,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={20}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.away_team}
                                        </span>
                                      </div>
                                      <TeamWinValues
                                        schedule={awayTeamData.schedule}
                                        logoUrl={
                                          awayTeamData.team_info.logo_url || ""
                                        }
                                        primaryColor={
                                          awayTeamData.team_info.primary_color
                                        }
                                      />
                                    </div>
                                  </div>
                                  {/* Home Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{homeNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 8,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                        overflowY: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 8,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={20}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.home_team}
                                        </span>
                                      </div>
                                      <TeamWinValues
                                        schedule={homeTeamData.schedule}
                                        logoUrl={
                                          homeTeamData.team_info.logo_url || ""
                                        }
                                        primaryColor={
                                          homeTeamData.team_info.primary_color
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Desktop: Row 1: Paragraphs */}
                                  <div style={twoColGrid}>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <p style={narrStyle}>{homeNarr}</p>
                                  </div>
                                  {/* Desktop: Row 2: Components */}
                                  <div style={twoColGrid}>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 8,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                        overflowY: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 8,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={20}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.away_team}
                                        </span>
                                      </div>
                                      <TeamWinValues
                                        schedule={awayTeamData.schedule}
                                        logoUrl={
                                          awayTeamData.team_info.logo_url || ""
                                        }
                                        primaryColor={
                                          awayTeamData.team_info.primary_color
                                        }
                                      />
                                    </div>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 8,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                        overflowY: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 8,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={20}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.home_team}
                                        </span>
                                      </div>
                                      <TeamWinValues
                                        schedule={homeTeamData.schedule}
                                        logoUrl={
                                          homeTeamData.team_info.logo_url || ""
                                        }
                                        primaryColor={
                                          homeTeamData.team_info.primary_color
                                        }
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* ═══ PDF Page 3: Schedule Difficulty + Wins Breakdown ═══ */}
                        <div
                          data-pdf-page="3"
                          style={{
                            backgroundColor: "white",
                            padding: isMobile ? 10 : 20,
                            marginTop: 20,
                          }}
                        >
                          {/* 5. Schedule Difficulty */}
                          <div>
                            <h3
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#374151",
                                marginBottom: 4,
                                paddingBottom: 5,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Schedule Difficulty
                            </h3>
                            {(() => {
                              const full = buildScheduleDifficultyNarrative(
                                selectedGame.away_team,
                                selectedGame.home_team,
                                awayTeamData.schedule,
                                homeTeamData.schedule,
                              );
                              const [awayNarr, homeNarr] = full.split("\n\n");
                              const narrStyle: React.CSSProperties = {
                                fontSize: 11,
                                color: "#6b7280",
                                lineHeight: 1.5,
                                marginBottom: 12,
                              };
                              return isMobile ? (
                                <div style={twoColGrid}>
                                  {/* Away Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 12,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={24}
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
                                      <BasketballTeamScheduleDifficulty
                                        schedule={awayTeamData.schedule}
                                        allScheduleData={
                                          (awayTeamData.all_schedule_data as
                                            | AllScheduleGame[]
                                            | undefined) || []
                                        }
                                        teamConference={
                                          awayTeamData.team_info.conference
                                        }
                                        teamColor={
                                          awayTeamData.team_info
                                            .primary_color || TEAL
                                        }
                                        teamName={selectedGame.away_team}
                                      />
                                    </div>
                                  </div>
                                  {/* Home Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{homeNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 12,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={24}
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
                                      <BasketballTeamScheduleDifficulty
                                        schedule={homeTeamData.schedule}
                                        allScheduleData={
                                          (homeTeamData.all_schedule_data as
                                            | AllScheduleGame[]
                                            | undefined) || []
                                        }
                                        teamConference={
                                          homeTeamData.team_info.conference
                                        }
                                        teamColor={
                                          homeTeamData.team_info
                                            .primary_color || TEAL
                                        }
                                        teamName={selectedGame.home_team}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Desktop: Row 1: Paragraphs */}
                                  <div style={twoColGrid}>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <p style={narrStyle}>{homeNarr}</p>
                                  </div>
                                  {/* Desktop: Row 2: Components */}
                                  <div style={twoColGrid}>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 12,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={24}
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
                                      <BasketballTeamScheduleDifficulty
                                        schedule={awayTeamData.schedule}
                                        allScheduleData={
                                          (awayTeamData.all_schedule_data as
                                            | AllScheduleGame[]
                                            | undefined) || []
                                        }
                                        teamConference={
                                          awayTeamData.team_info.conference
                                        }
                                        teamColor={
                                          awayTeamData.team_info
                                            .primary_color || TEAL
                                        }
                                        teamName={selectedGame.away_team}
                                      />
                                    </div>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 12,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={24}
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
                                      <BasketballTeamScheduleDifficulty
                                        schedule={homeTeamData.schedule}
                                        allScheduleData={
                                          (homeTeamData.all_schedule_data as
                                            | AllScheduleGame[]
                                            | undefined) || []
                                        }
                                        teamConference={
                                          homeTeamData.team_info.conference
                                        }
                                        teamColor={
                                          homeTeamData.team_info
                                            .primary_color || TEAL
                                        }
                                        teamName={selectedGame.home_team}
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* 6. Season Wins Breakdown */}
                          <div style={{ marginTop: 20 }}>
                            <h3
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#374151",
                                marginBottom: 4,
                                paddingBottom: 5,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Season Wins Breakdown
                            </h3>
                            {(() => {
                              const full = buildWinsBreakdownNarrative(
                                selectedGame.away_team,
                                selectedGame.home_team,
                                awayTeamData.schedule,
                                homeTeamData.schedule,
                                awayTeamData.team_info,
                                homeTeamData.team_info,
                                awayConfChampData,
                                homeConfChampData,
                              );
                              const [awayNarr, homeNarr] = full.split("\n\n");
                              const narrStyle: React.CSSProperties = {
                                fontSize: 11,
                                color: "#6b7280",
                                lineHeight: 1.5,
                                marginBottom: 12,
                              };
                              return isMobile ? (
                                <div style={twoColGrid}>
                                  {/* Away Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={24}
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
                                      <BasketballTeamWinsBreakdown
                                        schedule={awayTeamData.schedule}
                                        teamName={selectedGame.away_team}
                                        conference={
                                          awayTeamData.team_info.conference
                                        }
                                        primaryColor={
                                          awayTeamData.team_info
                                            .primary_color || "#18627b"
                                        }
                                        secondaryColor={
                                          awayTeamData.team_info.secondary_color
                                        }
                                        logoUrl={
                                          awayTeamData.team_info.logo_url || ""
                                        }
                                      />
                                    </div>
                                  </div>
                                  {/* Home Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{homeNarr}</p>
                                    <div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={24}
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
                                      <BasketballTeamWinsBreakdown
                                        schedule={homeTeamData.schedule}
                                        teamName={selectedGame.home_team}
                                        conference={
                                          homeTeamData.team_info.conference
                                        }
                                        primaryColor={
                                          homeTeamData.team_info
                                            .primary_color || "#18627b"
                                        }
                                        secondaryColor={
                                          homeTeamData.team_info.secondary_color
                                        }
                                        logoUrl={
                                          homeTeamData.team_info.logo_url || ""
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Desktop: Row 1: Paragraphs */}
                                  <div style={twoColGrid}>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <p style={narrStyle}>{homeNarr}</p>
                                  </div>
                                  {/* Desktop: Row 2: Components */}
                                  <div style={twoColGrid}>
                                    <div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={24}
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
                                      <BasketballTeamWinsBreakdown
                                        schedule={awayTeamData.schedule}
                                        teamName={selectedGame.away_team}
                                        conference={
                                          awayTeamData.team_info.conference
                                        }
                                        primaryColor={
                                          awayTeamData.team_info
                                            .primary_color || "#18627b"
                                        }
                                        secondaryColor={
                                          awayTeamData.team_info.secondary_color
                                        }
                                        logoUrl={
                                          awayTeamData.team_info.logo_url || ""
                                        }
                                      />
                                    </div>
                                    <div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={24}
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
                                      <BasketballTeamWinsBreakdown
                                        schedule={homeTeamData.schedule}
                                        teamName={selectedGame.home_team}
                                        conference={
                                          homeTeamData.team_info.conference
                                        }
                                        primaryColor={
                                          homeTeamData.team_info
                                            .primary_color || "#18627b"
                                        }
                                        secondaryColor={
                                          homeTeamData.team_info.secondary_color
                                        }
                                        logoUrl={
                                          homeTeamData.team_info.logo_url || ""
                                        }
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      {/* ═══ End PDF Container ═══ */}
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
