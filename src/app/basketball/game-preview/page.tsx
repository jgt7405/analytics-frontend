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

function buildGameDifficultyContext(
  schedule: TeamGameData[],
  opponentName: string,
  gameDate: string,
  locationFilter: string,
  teamName: string,
): string {
  const locGames = schedule.filter((g) => g.location === locationFilter);
  const withProb = locGames
    .filter((g) => g.team_win_prob !== undefined && g.team_win_prob !== null)
    .sort((a, b) => (a.team_win_prob ?? 1) - (b.team_win_prob ?? 1));

  const idx = withProb.findIndex(
    (g) => g.opponent === opponentName && g.date === gameDate,
  );
  if (idx < 0 || withProb.length === 0) return "";

  const rank = idx + 1;
  const total = withProb.length;
  const locLabel = locationFilter.toLowerCase();

  // Games harder than this one (lower index = harder)
  const harderGames = withProb.slice(0, idx);
  const harderWins = harderGames.filter((g) => g.status === "W").length;
  const harderLosses = harderGames.filter((g) => g.status === "L").length;
  const harderUpcoming = harderGames.filter(
    (g) => g.status !== "W" && g.status !== "L",
  ).length;

  const parts: string[] = [];
  parts.push(
    `This is the ${ordinal(rank)} most difficult ${locLabel} game of ${total} for ${teamName}.`,
  );

  if (harderGames.length > 0) {
    const resultParts: string[] = [];
    if (harderWins > 0 && harderLosses > 0) {
      resultParts.push(
        `they are ${harderWins}-${harderLosses} in more difficult ${locLabel} games`,
      );
    } else if (harderLosses > 0 && harderWins === 0) {
      resultParts.push(
        `they have lost all ${harderLosses} more difficult ${locLabel} game${harderLosses !== 1 ? "s" : ""}`,
      );
    } else if (harderWins > 0 && harderLosses === 0) {
      resultParts.push(
        `they have won all ${harderWins} more difficult ${locLabel} game${harderWins !== 1 ? "s" : ""}`,
      );
    }
    if (harderUpcoming > 0) {
      resultParts.push(
        `${harderUpcoming} tougher ${locLabel} game${harderUpcoming !== 1 ? "s" : ""} remaining`,
      );
    }
    if (resultParts.length > 0) {
      parts.push(
        resultParts.join(" with ").charAt(0).toUpperCase() +
          resultParts.join(" with ").slice(1) +
          ".",
      );
    }
  }

  return parts.join(" ");
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
function computeConfPosition(
  teamName: string,
  standings: ConferenceStandingsTeam[],
): string {
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
    if (
      sorted[i].conf_wins !== prevWins ||
      sorted[i].conf_losses !== prevLosses
    ) {
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
async function fetchConferenceStandings(
  conference: string,
): Promise<ConferenceStandingsTeam[]> {
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
  teamName: string,
  metrics: ComputedMetrics,
  teamInfo: TeamInfo,
  isHome: boolean,
  opponentName: string,
  gameDate: string,
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

  let ratingDesc = "";
  if (metrics.kenpomRank) {
    if (metrics.kenpomRank <= 10)
      ratingDesc = `an elite team ranked #${metrics.kenpomRank} in Composite Rating`;
    else if (metrics.kenpomRank <= 25)
      ratingDesc = `a top-25 team at #${metrics.kenpomRank} Composite`;
    else if (metrics.kenpomRank <= 50)
      ratingDesc = `ranked #${metrics.kenpomRank} Composite`;
    else ratingDesc = `sitting at #${metrics.kenpomRank} Composite`;
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

  // Game difficulty context
  const locFilter = isHome ? "Home" : "Away";
  const diffContext = buildGameDifficultyContext(
    schedule,
    opponentName,
    gameDate,
    locFilter,
    teamName,
  );

  const parts: string[] = [];
  parts.push(
    `${teamName} enters at ${overallW}-${overallL} overall (${confW}-${confL} conf).`,
  );
  if (ratingDesc) parts.push(`They are ${ratingDesc}.`);
  if (streakDesc) parts.push(`The team is ${streakDesc}.`);
  if (recentForm)
    parts.push(`They've gone ${metrics.last5} in their last 5, ${recentForm}.`);
  if (tourneyDesc) parts.push(`They are currently ${tourneyDesc}.`);
  if (teamInfo.average_seed)
    parts.push(`Projected average seed: ${teamInfo.average_seed.toFixed(1)}.`);
  if (diffContext) parts.push(diffContext);
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

  // Win probability lead
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

  // Rating comparison
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

  // Streak comparison
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

  // Conference position
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
): string {
  const parts: string[] = [];

  // Tournament bid implications
  const awayBid = awayInfo.tournament_bid_pct;
  const homeBid = homeInfo.tournament_bid_pct;

  if (awayBid !== undefined && homeBid !== undefined) {
    if (awayBid >= 25 && awayBid <= 75 && homeBid >= 25 && homeBid <= 75) {
      parts.push(
        `Both teams are on the bubble — ${awayTeam} at ${awayBid.toFixed(0)}% and ${homeTeam} at ${homeBid.toFixed(0)}% tournament probability. This game could be pivotal for NCAA Tournament hopes.`,
      );
    } else if (awayBid >= 25 && awayBid <= 75) {
      parts.push(
        `${awayTeam} is on the bubble at ${awayBid.toFixed(0)}% tournament probability, while ${homeTeam} sits at ${homeBid.toFixed(0)}%. A big game for ${awayTeam}'s tournament case.`,
      );
    } else if (homeBid >= 25 && homeBid <= 75) {
      parts.push(
        `${homeTeam} is on the bubble at ${homeBid.toFixed(0)}% tournament probability, while ${awayTeam} sits at ${awayBid.toFixed(0)}%. The outcome carries major implications for ${homeTeam}.`,
      );
    } else if (awayBid >= 95 && homeBid >= 95) {
      parts.push(
        `${awayTeam} (${awayBid.toFixed(0)}%) and ${homeTeam} (${homeBid.toFixed(0)}%) are both tournament locks, but seeding implications are still at stake.`,
      );
    } else {
      parts.push(
        `${awayTeam} has a ${awayBid.toFixed(0)}% tournament bid probability while ${homeTeam} is at ${homeBid.toFixed(0)}%.`,
      );
    }
  }

  // Average seed implications
  if (awayInfo.average_seed && homeInfo.average_seed) {
    parts.push(
      `Projected seeds: ${awayTeam} at ${awayInfo.average_seed.toFixed(1)}, ${homeTeam} at ${homeInfo.average_seed.toFixed(1)}.`,
    );
  }

  return (
    parts.join(" ") ||
    `How a win or loss shifts conference tournament seeding and NCAA Tournament projections for ${awayTeam} and ${homeTeam}.`
  );
}

function buildWinValuesNarrative(
  awayTeam: string,
  homeTeam: string,
  awaySchedule: TeamGameData[],
  homeSchedule: TeamGameData[],
): string {
  const getLatestTwv = (schedule: TeamGameData[]) => {
    const completed = schedule.filter(
      (g) => g.status === "W" || g.status === "L",
    );
    if (completed.length === 0) return null;
    return completed[completed.length - 1].twv ?? null;
  };
  const getLatestCwv = (schedule: TeamGameData[]) => {
    const completed = schedule.filter(
      (g) =>
        (g.status === "W" || g.status === "L") &&
        g.cwv !== undefined &&
        g.cwv !== null,
    );
    if (completed.length === 0) return null;
    return completed[completed.length - 1].cwv ?? null;
  };

  const awayTwv = getLatestTwv(awaySchedule);
  const homeTwv = getLatestTwv(homeSchedule);
  const awayCwv = getLatestCwv(awaySchedule);
  const homeCwv = getLatestCwv(homeSchedule);

  const parts: string[] = [];

  // TWV comparison
  if (awayTwv !== null && homeTwv !== null) {
    const twvDesc = (team: string, twv: number) => {
      if (twv >= 2)
        return `${team} has significantly outperformed expectations (TWV: ${twv > 0 ? "+" : ""}${twv.toFixed(1)})`;
      if (twv >= 0.5)
        return `${team} is modestly exceeding expectations (TWV: +${twv.toFixed(1)})`;
      if (twv > -0.5)
        return `${team} is performing roughly as expected (TWV: ${twv >= 0 ? "+" : ""}${twv.toFixed(1)})`;
      if (twv > -2)
        return `${team} is slightly underperforming (TWV: ${twv.toFixed(1)})`;
      return `${team} has significantly underperformed expectations (TWV: ${twv.toFixed(1)})`;
    };
    parts.push(
      `${twvDesc(awayTeam, awayTwv)}, while ${twvDesc(homeTeam, homeTwv).charAt(0).toLowerCase() + twvDesc(homeTeam, homeTwv).slice(1)}.`,
    );
  }

  // CWV highlight
  if (awayCwv !== null && homeCwv !== null) {
    if (Math.abs(awayCwv - homeCwv) >= 2) {
      const better = awayCwv > homeCwv ? awayTeam : homeTeam;
      const worse = awayCwv > homeCwv ? homeTeam : awayTeam;
      const betterCwv = Math.max(awayCwv, homeCwv);
      const worseCwv = Math.min(awayCwv, homeCwv);
      parts.push(
        `In conference play, ${better} (CWV: ${betterCwv > 0 ? "+" : ""}${betterCwv.toFixed(1)}) has been notably stronger than ${worse} (CWV: ${worseCwv > 0 ? "+" : ""}${worseCwv.toFixed(1)}).`,
      );
    } else {
      parts.push(
        `In conference play, ${awayTeam} (CWV: ${awayCwv >= 0 ? "+" : ""}${awayCwv.toFixed(1)}) and ${homeTeam} (CWV: ${homeCwv >= 0 ? "+" : ""}${homeCwv.toFixed(1)}) are tracking similarly.`,
      );
    }
  }

  return (
    parts.join(" ") ||
    `Team Win Value (TWV) tracks how ${awayTeam}'s and ${homeTeam}'s actual wins compare to their expected win probability across the season.`
  );
}

function buildScheduleDifficultyNarrative(
  awayTeam: string,
  homeTeam: string,
  awaySchedule: TeamGameData[],
  homeSchedule: TeamGameData[],
): string {
  const avgDifficulty = (schedule: TeamGameData[]) => {
    const withProb = schedule.filter(
      (g) => g.kenpom_win_prob !== undefined && g.kenpom_win_prob !== null,
    );
    if (withProb.length === 0) return null;
    return (
      withProb.reduce((sum, g) => sum + (g.kenpom_win_prob ?? 0), 0) /
      withProb.length
    );
  };

  const hardestGame = (schedule: TeamGameData[]) => {
    const withProb = schedule.filter(
      (g) => g.kenpom_win_prob !== undefined && g.kenpom_win_prob !== null,
    );
    if (withProb.length === 0) return null;
    return withProb.reduce((min, g) =>
      (g.kenpom_win_prob ?? 1) < (min.kenpom_win_prob ?? 1) ? g : min,
    );
  };

  const countTopGames = (schedule: TeamGameData[], threshold: number) => {
    return schedule.filter(
      (g) =>
        g.kenpom_rank && g.kenpom_rank !== 999 && g.kenpom_rank <= threshold,
    ).length;
  };

  const parts: string[] = [];

  const awayAvg = avgDifficulty(awaySchedule);
  const homeAvg = avgDifficulty(homeSchedule);

  if (awayAvg !== null && homeAvg !== null) {
    const harder = awayAvg < homeAvg ? awayTeam : homeTeam;
    const harderAvg = Math.min(awayAvg, homeAvg);
    const easierAvg = Math.max(awayAvg, homeAvg);
    if (Math.abs(awayAvg - homeAvg) >= 0.08) {
      parts.push(
        `${harder} has faced the tougher schedule (avg win prob ${(harderAvg * 100).toFixed(0)}% vs ${(easierAvg * 100).toFixed(0)}%).`,
      );
    } else {
      parts.push(
        `Both teams have faced similar schedule difficulty (avg win prob ~${(((awayAvg + homeAvg) / 2) * 100).toFixed(0)}%).`,
      );
    }
  }

  // Top-25 / Top-50 games
  const awayTop25 = countTopGames(awaySchedule, 25);
  const homeTop25 = countTopGames(homeSchedule, 25);
  if (awayTop25 > 0 || homeTop25 > 0) {
    parts.push(
      `${awayTeam} has played ${awayTop25} top-25 opponent${awayTop25 !== 1 ? "s" : ""} vs ${homeTop25} for ${homeTeam}.`,
    );
  }

  // Hardest game
  const awayHardest = hardestGame(awaySchedule);
  const homeHardest = hardestGame(homeSchedule);
  if (awayHardest && homeHardest) {
    parts.push(
      `Toughest tests: ${awayTeam} faced ${awayHardest.opponent}${awayHardest.kenpom_rank && awayHardest.kenpom_rank !== 999 ? ` (#${awayHardest.kenpom_rank})` : ""}, ${homeTeam} faced ${homeHardest.opponent}${homeHardest.kenpom_rank && homeHardest.kenpom_rank !== 999 ? ` (#${homeHardest.kenpom_rank})` : ""}.`,
    );
  }

  return (
    parts.join(" ") ||
    `Comparing ${awayTeam}'s and ${homeTeam}'s schedule difficulty across their seasons.`
  );
}

function buildWinsBreakdownNarrative(
  awayTeam: string,
  homeTeam: string,
  awaySchedule: TeamGameData[],
  homeSchedule: TeamGameData[],
): string {
  const getWinsByCategory = (schedule: TeamGameData[]) => {
    let quality = 0; // top-50
    let mid = 0; // 51-150
    let low = 0; // 151+
    let confWins = 0;
    let confLosses = 0;
    schedule.forEach((g) => {
      if (g.status === "W") {
        if (g.kenpom_rank && g.kenpom_rank !== 999 && g.kenpom_rank <= 50)
          quality++;
        else if (g.kenpom_rank && g.kenpom_rank !== 999 && g.kenpom_rank <= 150)
          mid++;
        else low++;
      }
      if (g.team_conf && (g.status === "W" || g.status === "L")) {
        if (g.status === "W") confWins++;
        else confLosses++;
      }
    });
    const losses = schedule.filter((g) => g.status === "L").length;
    const badLosses = schedule.filter(
      (g) =>
        g.status === "L" &&
        g.kenpom_rank &&
        g.kenpom_rank !== 999 &&
        g.kenpom_rank > 150,
    ).length;
    return { quality, mid, low, losses, badLosses, confWins, confLosses };
  };

  const away = getWinsByCategory(awaySchedule);
  const home = getWinsByCategory(homeSchedule);
  const parts: string[] = [];

  // Quality wins comparison
  if (away.quality > 0 || home.quality > 0) {
    if (away.quality > home.quality) {
      parts.push(
        `${awayTeam} has the resume edge with ${away.quality} top-50 win${away.quality !== 1 ? "s" : ""} vs ${home.quality} for ${homeTeam}.`,
      );
    } else if (home.quality > away.quality) {
      parts.push(
        `${homeTeam} holds more quality wins with ${home.quality} top-50 win${home.quality !== 1 ? "s" : ""} vs ${away.quality} for ${awayTeam}.`,
      );
    } else if (away.quality > 0) {
      parts.push(
        `Both teams have ${away.quality} top-50 win${away.quality !== 1 ? "s" : ""}.`,
      );
    }
  }

  // Bad losses
  if (away.badLosses > 0 || home.badLosses > 0) {
    if (away.badLosses > 0 && home.badLosses > 0) {
      parts.push(
        `Both teams have blemishes — ${awayTeam} with ${away.badLosses} loss${away.badLosses !== 1 ? "es" : ""} to sub-150 teams, ${homeTeam} with ${home.badLosses}.`,
      );
    } else if (away.badLosses > 0) {
      parts.push(
        `${awayTeam} carries ${away.badLosses} loss${away.badLosses !== 1 ? "es" : ""} to sub-150 opponents.`,
      );
    } else {
      parts.push(
        `${homeTeam} carries ${home.badLosses} loss${home.badLosses !== 1 ? "es" : ""} to sub-150 opponents.`,
      );
    }
  }

  return (
    parts.join(" ") ||
    `A breakdown of how ${awayTeam}'s and ${homeTeam}'s wins and losses distribute across opponent quality tiers.`
  );
}

// ─── Section Description Style ───────────────────────────────────────────────

const sectionDescStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  lineHeight: 1.5,
  marginBottom: 10,
  marginTop: 2,
};

// ─── 3-Column Schedule Strip (Away | Neutral | Home) ─────────────────────────
// Smaller, more illustrative version with teal highlighting only for the specific next game

function ThreeColumnSchedule({
  schedule,
  upcomingOpponent,
  upcomingDate,
}: {
  schedule: TeamGameData[];
  upcomingOpponent: string;
  upcomingDate: string;
}) {
  // Find the next unplayed game chronologically, with fallback to the selected game's opponent/date
  const nextGame = (() => {
    // First try: find chronologically next unplayed game
    const chronoNext = [...schedule]
      .sort((a, b) => a.date.localeCompare(b.date))
      .find((g) => g.status !== "W" && g.status !== "L");
    if (chronoNext) return chronoNext;
    // Fallback: match by the selected game's opponent and date
    if (upcomingOpponent && upcomingDate) {
      return (
        schedule.find(
          (g) => g.opponent === upcomingOpponent && g.date === upcomingDate,
        ) || null
      );
    }
    return null;
  })();

  // Group by location and sort by kenpom rank (hardest at top)
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

  // Sort each group by kenpom rank (best rank = hardest opponent at top)
  (["Away", "Neutral", "Home"] as const).forEach((loc) => {
    grouped[loc].sort((a, b) => {
      const aRank =
        !a.kenpom_rank || a.kenpom_rank === 999 ? 9999 : a.kenpom_rank;
      const bRank =
        !b.kenpom_rank || b.kenpom_rank === 999 ? 9999 : b.kenpom_rank;
      return aRank - bRank;
    });
  });

  // Smaller sizes for schedule display
  const BOX_W = 42;
  const BOX_H = 24;
  const LOGO_SIZE = 14;

  // Check if a game is the next upcoming game
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
// Matches the whatif page NextGameImpact component layout exactly:
// Conference Tournament (summary metrics + seed probabilities)
// No NCAA section - matches whatif page NextGameImpact

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
          style={{ borderColor: `${TEAL} transparent transparent transparent` }}
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
  const COL_DATA = { minWidth: "50px", width: "50px" };

  // Summary metrics - matches whatif page NextGameImpact exactly
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
      {/* Team Header - shows which team this data is for */}
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

      {/* Matchup header - matches whatif page */}
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

      {/* ═══ CONFERENCE TOURNAMENT PROBABILITIES ═══ */}
      <h4 className="text-xs font-medium mb-1.5">
        Conference Tournament Probabilities
      </h4>

      {/* Summary Metrics Table - matches whatif NextGameImpact */}
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

      {/* Seed Probabilities - matches whatif NextGameImpact */}
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

      {/* ═══ Gray divider ═══ */}
      <div className="my-3 border-t border-gray-300" />

      {/* ═══ NCAA TOURNAMENT PROBABILITIES ═══ */}
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
          {/* In Tourney Prob */}
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
          {/* Avg NCAA Seed */}
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

      {/* NCAA Seed Distribution */}
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
                {/* Out of Tournament row */}
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

      {/* Explainer text */}
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
  // winProb is the home team's win probability (0-1 scale or 0-100)
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
      label: "Conf. Record",
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
      {/* Team Headers - colored backgrounds fill full grid cell */}
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
      {/* Metrics Rows */}
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
    windowWidth: Math.max(element.scrollWidth, 960),
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
  const [awayConfStandings, setAwayConfStandings] = useState<
    ConferenceStandingsTeam[]
  >([]);
  const [homeConfStandings, setHomeConfStandings] = useState<
    ConferenceStandingsTeam[]
  >([]);
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
      setAwayConfStandings([]);
      setHomeConfStandings([]);
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

        // Fetch conference standings for position calculation
        const awayConf = (awayResp as unknown as TeamDataResponse).team_info
          .conference;
        const homeConf = (homeResp as unknown as TeamDataResponse).team_info
          .conference;
        const [awayStandings, homeStandings] = await Promise.all([
          fetchConferenceStandings(awayConf),
          awayConf === homeConf
            ? fetchConferenceStandings(homeConf)
            : fetchConferenceStandings(homeConf),
        ]);
        setAwayConfStandings(awayStandings);
        setHomeConfStandings(
          awayConf === homeConf ? awayStandings : homeStandings,
        );
      } catch (err) {
        console.error("Error loading preview:", err);
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

  // Compute conf positions
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
      await generatePDF(previewRef, selectedGame.label);
    } finally {
      setIsPdfGenerating(false);
    }
  }, [selectedGame]);

  const gameKey = (g: UpcomingGame) =>
    `${g.away_team}@${g.home_team}-${g.date_sort}`;

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
                  Select Game ({filteredGames.length} upcoming)
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

              {/* ── Game Preview Content ─────────────────────── */}
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

                      {/* ═══ Printable Preview Area ═══ */}
                      <div
                        ref={previewRef}
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
                          {/* Away team narrative */}
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
                                logoUrl={awayTeamData.team_info.logo_url || ""}
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

                          {/* Home team narrative */}
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
                                logoUrl={homeTeamData.team_info.logo_url || ""}
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

                        {/* 3. Next Game Win/Loss Impact */}
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
                            Next Game Win/Loss Impact
                          </h3>
                          <p style={sectionDescStyle}>
                            {buildNextGameImpactNarrative(
                              selectedGame.away_team,
                              selectedGame.home_team,
                              awayTeamData.team_info,
                              homeTeamData.team_info,
                            )}
                          </p>
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
                                conference={awayTeamData.team_info.conference}
                                teamInfo={awayTeamData.team_info}
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
                                conference={homeTeamData.team_info.conference}
                                teamInfo={homeTeamData.team_info}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* ═══ End Printable Area ═══ */}

                      {/* 4. Win Values Over Time (interactive - outside PDF) */}
                      <div style={{ marginTop: 24 }}>
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
                        <p style={sectionDescStyle}>
                          {buildWinValuesNarrative(
                            selectedGame.away_team,
                            selectedGame.home_team,
                            awayTeamData.schedule,
                            homeTeamData.schedule,
                          )}
                        </p>
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
                                logoUrl={awayTeamData.team_info.logo_url || ""}
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
                              logoUrl={awayTeamData.team_info.logo_url || ""}
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
                                logoUrl={homeTeamData.team_info.logo_url || ""}
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
                              logoUrl={homeTeamData.team_info.logo_url || ""}
                              primaryColor={
                                homeTeamData.team_info.primary_color
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* 5. Schedule Difficulty */}
                      <div style={{ marginTop: 24 }}>
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
                        <p style={sectionDescStyle}>
                          {buildScheduleDifficultyNarrative(
                            selectedGame.away_team,
                            selectedGame.home_team,
                            awayTeamData.schedule,
                            homeTeamData.schedule,
                          )}
                        </p>
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
                                logoUrl={awayTeamData.team_info.logo_url || ""}
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
                              teamConference={awayTeamData.team_info.conference}
                              teamColor={
                                awayTeamData.team_info.primary_color || TEAL
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
                                logoUrl={homeTeamData.team_info.logo_url || ""}
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
                              teamConference={homeTeamData.team_info.conference}
                              teamColor={
                                homeTeamData.team_info.primary_color || TEAL
                              }
                              teamName={selectedGame.home_team}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 6. Season Wins Breakdown */}
                      <div style={{ marginTop: 24 }}>
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
                        <p style={sectionDescStyle}>
                          {buildWinsBreakdownNarrative(
                            selectedGame.away_team,
                            selectedGame.home_team,
                            awayTeamData.schedule,
                            homeTeamData.schedule,
                          )}
                        </p>
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
                                logoUrl={awayTeamData.team_info.logo_url || ""}
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
                              conference={awayTeamData.team_info.conference}
                              primaryColor={
                                awayTeamData.team_info.primary_color ||
                                "#18627b"
                              }
                              secondaryColor={
                                awayTeamData.team_info.secondary_color
                              }
                              logoUrl={awayTeamData.team_info.logo_url || ""}
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
                                logoUrl={homeTeamData.team_info.logo_url || ""}
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
                              conference={homeTeamData.team_info.conference}
                              primaryColor={
                                homeTeamData.team_info.primary_color ||
                                "#18627b"
                              }
                              secondaryColor={
                                homeTeamData.team_info.secondary_color
                              }
                              logoUrl={homeTeamData.team_info.logo_url || ""}
                            />
                          </div>
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
