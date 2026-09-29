// Summary sentence for the head-to-head comparison.

import { type ComputedMetrics, type TeamInfo } from "@/types/gamePreview";

// ─── Dynamic Section Narratives ──────────────────────────────────────────────

export function buildHeadToHeadNarrative(
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
