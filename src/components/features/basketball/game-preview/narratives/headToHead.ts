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
  isConferenceGame: boolean,
): string {
  const parts: string[] = [];

  if (winProb !== null) {
    const homeWinPct = winProb > 1 ? winProb : winProb * 100;
    const awayWinPct = 100 - homeWinPct;
    const favorite = homeWinPct > awayWinPct ? homeTeam : awayTeam;
    const favPct = Math.round(Math.max(homeWinPct, awayWinPct));
    if (favPct >= 75) {
      parts.push(`${favorite} is a heavy favorite with a ${favPct}% chance to win.`);
    } else if (favPct >= 60) {
      parts.push(`${favorite} is favored with a ${favPct}% chance to win.`);
    } else if (favPct > 50) {
      parts.push(
        `This projects as close to a toss-up, with ${favorite} a slight favorite at ${favPct}%.`,
      );
    } else {
      parts.push(`This projects as a true toss-up.`);
    }
  }

  if (awayMetrics.kenpomRank && homeMetrics.kenpomRank) {
    const gap = Math.abs(awayMetrics.kenpomRank - homeMetrics.kenpomRank);
    if (gap >= 50) {
      const higher =
        awayMetrics.kenpomRank < homeMetrics.kenpomRank ? awayTeam : homeTeam;
      parts.push(
        `${higher} holds a big ratings edge (#${Math.min(awayMetrics.kenpomRank, homeMetrics.kenpomRank)} vs #${Math.max(awayMetrics.kenpomRank, homeMetrics.kenpomRank)} in the composite ratings).`,
      );
    } else if (gap >= 15) {
      const higher =
        awayMetrics.kenpomRank < homeMetrics.kenpomRank ? awayTeam : homeTeam;
      parts.push(
        `${higher} is the higher-rated team (#${Math.min(awayMetrics.kenpomRank, homeMetrics.kenpomRank)} vs #${Math.max(awayMetrics.kenpomRank, homeMetrics.kenpomRank)} in the composite ratings).`,
      );
    } else {
      parts.push(
        `The two are closely rated: ${awayTeam} is #${awayMetrics.kenpomRank} and ${homeTeam} is #${homeMetrics.kenpomRank} in the composite ratings.`,
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

  if (!isConferenceGame) {
    parts.push(
      `It's a non-conference game, so it won't affect either team's conference standing.`,
    );
  } else {
    const confGames = (m: ComputedMetrics) =>
      m.conferenceRecord.split("-").map(Number).reduce((a, b) => a + (b || 0), 0);
    const awayOpener = confGames(awayMetrics) === 0;
    const homeOpener = confGames(homeMetrics) === 0;
    const conf = homeInfo.conference || awayInfo.conference;
    if (awayOpener && homeOpener) {
      parts.push(`It's the ${conf} opener for both teams.`);
    } else if (awayOpener || homeOpener) {
      parts.push(`It's the ${conf} opener for ${awayOpener ? awayTeam : homeTeam}.`);
    } else if (
      awayMetrics.confPosition !== "—" &&
      homeMetrics.confPosition !== "—"
    ) {
      parts.push(
        `In the ${conf} standings, ${awayTeam} sits ${awayMetrics.confPosition} and ${homeTeam} sits ${homeMetrics.confPosition}.`,
      );
    }
  }

  return (
    parts.join(" ") ||
    `${awayTeam} (${awayMetrics.overallRecord}) visits ${homeTeam} (${homeMetrics.overallRecord}) in this matchup.`
  );
}
