// Summary of the team's schedule difficulty.

import { type TeamGameData } from "@/types/gamePreview";
import { joinWithAnd } from "../metrics";

export function buildScheduleDifficultyNarrative(
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

    // Expected wins based on rk50_win_prob (50th rated team) over ALL completed games
    const withProb = completed.filter(
      (g) => g.rk50_win_prob !== undefined && g.rk50_win_prob !== null,
    );
    const expectedWins = withProb.reduce(
      (sum, g) => sum + (g.rk50_win_prob ?? 0),
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
        `The 50th rated team would have expected ${expectedWins.toFixed(1)} wins for a ${expectedWinPct}% win percent — putting their TWV at ${twv >= 0 ? "+" : ""}${twv.toFixed(1)}.`,
      );
    }

    // Top wins — use rk50_win_prob (50th rated team win probability)
    const qualityWins = wins
      .filter(
        (g) =>
          g.kenpom_rank &&
          g.kenpom_rank !== 999 &&
          g.rk50_win_prob !== undefined,
      )
      .sort((a, b) => (a.rk50_win_prob ?? 1) - (b.rk50_win_prob ?? 1));
    if (qualityWins.length > 0) {
      const topWins = qualityWins.slice(0, 3).map((g, i) => {
        const prob =
          g.rk50_win_prob !== undefined
            ? Math.round((g.rk50_win_prob ?? 0) * 100)
            : null;
        return `${g.opponent}${prob !== null ? ` (${prob}%${i === 0 ? " win probability for 50th rated team" : " probability"})` : ""}`;
      });
      parts.push(`Top wins include ${joinWithAnd(topWins)}.`);
    }

    // Worst losses — use rk50_win_prob
    const badLosses = losses
      .filter(
        (g) =>
          g.kenpom_rank &&
          g.kenpom_rank !== 999 &&
          g.rk50_win_prob !== undefined,
      )
      .sort((a, b) => (b.rk50_win_prob ?? 0) - (a.rk50_win_prob ?? 0));
    if (badLosses.length > 0) {
      const worstLosses = badLosses.slice(0, 3).map((g) => {
        const prob =
          g.rk50_win_prob !== undefined
            ? Math.round((g.rk50_win_prob ?? 0) * 100)
            : null;
        return `${g.opponent}${prob !== null ? ` (${prob}% probability)` : ""}`;
      });
      parts.push(`Worst losses include ${joinWithAnd(worstLosses)}.`);
    }

    return parts.join(" ");
  };

  return `${teamParagraph(awayTeam, awaySchedule)}\n\n${teamParagraph(homeTeam, homeSchedule)}`;
}
