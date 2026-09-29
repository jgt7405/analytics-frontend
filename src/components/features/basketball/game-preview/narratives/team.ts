// The paragraph under each team: record, form, schedule, next game.

import { type ComputedMetrics, type TeamGameData, type TeamInfo } from "@/types/gamePreview";
import { cap, locationPhrase, ordinal } from "../metrics";

export function buildTeamNarrative(
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
  // Determine actual game location from schedule (handles neutral-site games)
  const upcomingGame = schedule.find(
    (g) => g.opponent === opponentName && g.status !== "W" && g.status !== "L",
  );
  const locFilter =
    upcomingGame?.location === "Neutral" ? "Neutral" : isHome ? "Home" : "Away";
  const locLabel = locFilter.toLowerCase();
  const locGames = schedule.filter((g) => g.location === locFilter);
  const locCompleted = locGames.filter(
    (g) => g.status === "W" || g.status === "L",
  );
  const locW = locCompleted.filter((g) => g.status === "W").length;
  const locL = locCompleted.filter((g) => g.status === "L").length;

  // Rank this game by difficulty within location games using rk50_win_prob
  const withProb = locGames
    .filter(
      (g) => g.rk50_win_prob !== undefined && g.rk50_win_prob !== null,
    )
    .sort((a, b) => (a.rk50_win_prob ?? 1) - (b.rk50_win_prob ?? 1));

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
    const gameProb = Math.round((withProb[gameIdx].rk50_win_prob ?? 0) * 100);
    parts.push(
      `This is the ${ordinal(rank)} most difficult ${locLabel} game of ${total} for ${teamName} (with ${gameProb}% win probability for the 50th rated team).`,
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
    parts.push(`Overall they are ${locW}-${locL} ${locationPhrase(locLabel)}.`);

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
    parts.push(`Overall they are ${locW}-${locL} ${locationPhrase(locLabel)}.`);
  }

  return parts.join(" ");
}
