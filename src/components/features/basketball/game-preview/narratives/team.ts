// The paragraph under each team: record, form, schedule, next game.

import { type ComputedMetrics, type TeamGameData } from "@/types/gamePreview";
import {
  findPreviewGame,
  isPlayed,
  locationAdjective,
  locationPhrase,
  ordinal,
  plural,
} from "../metrics";

/** "the toughest", "the 3rd toughest", "the easiest", "their only" (of N games). */
function difficultyRank(rank: number, total: number): string {
  if (total === 1) return "their only";
  if (rank === 1) return "the toughest";
  if (rank === total) return "the easiest";
  return `the ${ordinal(rank)} toughest`;
}

/** How the team comes in: record, then streak/form worded for how many games they've played. */
function formSentences(
  teamName: string,
  metrics: ComputedMetrics,
  played: TeamGameData[],
): string[] {
  const n = played.length;
  if (n === 0) return [`This is the season opener for ${teamName}.`];

  const [confW, confL] = metrics.conferenceRecord.split("-").map(Number);
  const confText =
    confW + confL > 0 ? ` (${metrics.conferenceRecord} in conference play)` : "";
  const parts = [`${teamName} enters at ${metrics.overallRecord}${confText}.`];

  const last = played[n - 1];
  if (n === 1) {
    parts.push(
      last.status === "W"
        ? `They won their opener against ${last.opponent}.`
        : `They lost their opener to ${last.opponent}.`,
    );
    return parts;
  }

  const streakN = parseInt(metrics.currentStreak.slice(1)) || 0;
  const winning = metrics.currentStreak.startsWith("W");
  if (streakN === n) {
    parts.push(winning ? "They're still unbeaten." : "They're still looking for their first win.");
  } else if (streakN === 1) {
    parts.push(
      winning
        ? `They're coming off a win over ${last.opponent}.`
        : `They're coming off a loss to ${last.opponent}.`,
    );
  } else if (winning) {
    parts.push(
      streakN >= 5
        ? `They're on a ${streakN}-game win streak.`
        : `They've won ${streakN} straight.`,
    );
  } else {
    parts.push(
      streakN >= 5
        ? `They've lost ${streakN} in a row.`
        : `They've dropped ${streakN} straight.`,
    );
  }

  // Last-5 form only once there are more than 5 games (otherwise it's just the record)
  // and only when the streak doesn't already say it.
  if (n > 5 && streakN < 5) {
    const [l5w] = metrics.last5.split("-").map(Number);
    if (l5w >= 4) parts.push(`They've gone ${metrics.last5} over their last 5.`);
    else if (l5w <= 1) parts.push(`They're just ${metrics.last5} over their last 5.`);
  }
  return parts;
}

export function buildTeamNarrative(
  teamName: string,
  metrics: ComputedMetrics,
  isHome: boolean,
  opponentName: string,
  gameDate: string,
  schedule: TeamGameData[],
): string {
  const played = schedule.filter(isPlayed);
  const parts = formSentences(teamName, metrics, played);

  // ─── Where this game ranks in difficulty among same-location games ───
  const thisGame = findPreviewGame(schedule, opponentName, gameDate);
  const loc = thisGame?.location || (isHome ? "Home" : "Away");
  const locWord = locationAdjective(loc);
  const locGames = schedule.filter((g) => g.location === loc);
  const locPlayed = locGames.filter(isPlayed);
  const locW = locPlayed.filter((g) => g.status === "W").length;
  const locL = locPlayed.length - locW;

  // Hardest first: lowest win probability for the 50th rated team
  const byDifficulty = locGames
    .filter((g) => g.rk50_win_prob !== undefined && g.rk50_win_prob !== null)
    .sort((a, b) => (a.rk50_win_prob ?? 1) - (b.rk50_win_prob ?? 1));
  const gameIdx = thisGame ? byDifficulty.indexOf(thisGame) : -1;

  if (gameIdx >= 0) {
    const rank = gameIdx + 1;
    const prob = Math.round((thisGame!.rk50_win_prob ?? 0) * 100);
    const total = byDifficulty.length;
    parts.push(
      total === 1
        ? `It's their only ${locWord} game; the 50th-rated team would win it ${prob}% of the time.`
        : `It's ${difficultyRank(rank, total)} of their ${total} ${locWord} games; the 50th-rated team would win it ${prob}% of the time.`,
    );

    const harder = byDifficulty.slice(0, gameIdx);
    const harderPlayed = harder.filter(isPlayed);
    const harderLeft = harder.length - harderPlayed.length;
    if (harderPlayed.length > 0) {
      const hw = harderPlayed.filter((g) => g.status === "W").length;
      parts.push(
        `They're ${hw}-${harderPlayed.length - hw} in tougher ${locWord} games so far${harderLeft > 0 ? `, with ${harderLeft} still to come` : ""}.`,
      );
    } else if (harderLeft > 0) {
      parts.push(
        `${harderLeft === 1 ? "One tougher" : `${harderLeft} tougher`} ${locWord} ${harderLeft === 1 ? "game is" : "games are"} still ahead.`,
      );
    }

    const easierPlayed = byDifficulty.slice(gameIdx + 1).filter(isPlayed);
    const ew = easierPlayed.filter((g) => g.status === "W").length;
    const el = easierPlayed.length - ew;
    if (el > 0) {
      parts.push(
        `They've already lost ${plural(el, `easier ${locWord} game`)}${ew > 0 ? ` (and won ${ew})` : ""}.`,
      );
    } else if (ew > 1) {
      parts.push(`They've won ${ew === 2 ? "both" : `all ${ew}`} easier ${locWord} games they've played.`);
    } else if (ew === 1) {
      parts.push(`They won the one easier ${locWord} game they've played.`);
    }
  }

  // Location record, or note that this is the first game at this kind of site
  if (locPlayed.length > 0) {
    parts.push(`They're ${locW}-${locL} ${locationPhrase(loc.toLowerCase())}.`);
  } else if (played.length > 0) {
    parts.push(`This is their first ${locWord} game of the season.`);
  }

  return parts.join(" ");
}
