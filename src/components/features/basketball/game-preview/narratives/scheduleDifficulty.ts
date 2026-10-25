// Summary of the team's schedule difficulty.

import { type TeamGameData } from "@/types/gamePreview";
import { isPlayed, joinWithAnd } from "../metrics";

const hasProb = (g: TeamGameData) =>
  g.rk50_win_prob !== undefined && g.rk50_win_prob !== null;
const isRated = (g: TeamGameData) => !!g.kenpom_rank && g.kenpom_rank !== 999;
const probPct = (g: TeamGameData) => Math.round((g.rk50_win_prob ?? 0) * 100);

/** "Army (the 50th-rated team would win that game 30% of the time), Navy (45%) and Air Force (60%)" */
function gameList(games: TeamGameData[]): string {
  return joinWithAnd(
    games.map((g, i) =>
      i === 0
        ? `${g.opponent} (the 50th-rated team would win that game ${probPct(g)}% of the time)`
        : `${g.opponent} (${probPct(g)}%)`,
    ),
  );
}

/** Expected wins for the 50th rated team over a set of games. */
function expected(games: TeamGameData[]) {
  const rated = games.filter(hasProb);
  const wins = rated.reduce((sum, g) => sum + (g.rk50_win_prob ?? 0), 0);
  return {
    count: rated.length,
    wins,
    pct: rated.length > 0 ? Math.round((wins / rated.length) * 100) : null,
  };
}

export function buildScheduleDifficultyNarrative(
  awayTeam: string,
  homeTeam: string,
  awaySchedule: TeamGameData[],
  homeSchedule: TeamGameData[],
): string {
  const teamParagraph = (team: string, schedule: TeamGameData[]) => {
    const played = schedule.filter(isPlayed);
    const wins = played.filter((g) => g.status === "W");
    const losses = played.filter((g) => g.status === "L");
    const remaining = schedule.filter((g) => !isPlayed(g));
    const parts: string[] = [];

    if (played.length === 0) {
      const all = expected(schedule);
      const top50 = schedule.filter((g) => isRated(g) && g.kenpom_rank! <= 50).length;
      parts.push(`${team} hasn't played yet.`);
      if (all.pct !== null) {
        parts.push(
          `Against this schedule, the 50th-rated team would be expected to win ${all.wins.toFixed(1)} of ${all.count} games (${all.pct}%).`,
        );
      }
      if (top50 > 0) {
        parts.push(`${top50} of those games are against current top-50 teams.`);
      }
      return parts.join(" ");
    }

    const past = expected(played);
    const twv = wins.length - past.wins;
    const twvText = `${twv >= 0 ? "+" : ""}${twv.toFixed(1)}`;
    if (played.length < 5) {
      parts.push(`${team} is ${wins.length}-${losses.length} so far.`);
      if (past.pct !== null) {
        parts.push(
          `The 50th-rated team would be expected to win ${past.wins.toFixed(1)} of ${past.count === 1 ? "that game" : `those ${past.count} games`}, so their TWV is ${twvText}.`,
        );
      }
    } else {
      const winPct = Math.round((wins.length / played.length) * 100);
      parts.push(`At ${wins.length}-${losses.length}, ${team} has won ${winPct}% of their games.`);
      if (past.pct !== null) {
        parts.push(
          `The 50th-rated team would be expected to win ${past.wins.toFixed(1)} of them (${past.pct}%), which puts their TWV at ${twvText}.`,
        );
      }
    }

    // Hardest wins first
    const bestWins = wins
      .filter((g) => isRated(g) && hasProb(g))
      .sort((a, b) => (a.rk50_win_prob ?? 1) - (b.rk50_win_prob ?? 1))
      .slice(0, 3);
    if (bestWins.length > 0) {
      parts.push(
        `${bestWins.length === 1 ? "Their best win is" : "Their best wins are"} ${gameList(bestWins)}.`,
      );
    }

    // Easiest losses first
    const worstLosses = losses
      .filter((g) => isRated(g) && hasProb(g))
      .sort((a, b) => (b.rk50_win_prob ?? 0) - (a.rk50_win_prob ?? 0))
      .slice(0, 3);
    if (worstLosses.length > 0) {
      parts.push(
        `${worstLosses.length === 1 ? "Their worst loss is" : "Their worst losses are"} ${gameList(worstLosses)}.`,
      );
    }

    const ahead = expected(remaining);
    if (ahead.pct !== null && ahead.count > 0) {
      parts.push(
        `Still ahead: ${ahead.count} game${ahead.count === 1 ? "" : "s"}, where the 50th-rated team would be expected to win ${ahead.wins.toFixed(1)} (${ahead.pct}%).`,
      );
    }

    return parts.join(" ");
  };

  return `${teamParagraph(awayTeam, awaySchedule)}\n\n${teamParagraph(homeTeam, homeSchedule)}`;
}
