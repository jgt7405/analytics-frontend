// Summary of TWV and CWV over the season.

import { type TeamGameData } from "@/types/gamePreview";
import { isPlayed } from "../metrics";

const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;

export function buildWinValuesNarrative(
  awayTeam: string,
  homeTeam: string,
  awaySchedule: TeamGameData[],
  homeSchedule: TeamGameData[],
): string {
  const teamParagraph = (team: string, schedule: TeamGameData[]) => {
    const played = schedule.filter(isPlayed);
    if (played.length === 0) {
      return (
        `${team} hasn't played yet, so TWV starts at 0. A win adds the chance the 50th-rated team would have lost that game; a loss subtracts the chance it would have won. ` +
        `CWV does the same for conference games against a .500 conference team, and starts with league play.`
      );
    }

    const latestTwv = played[played.length - 1].twv_50 ?? null;
    const confGames = played.filter((g) => g.cwv !== undefined && g.cwv !== null);
    const latestCwv =
      confGames.length > 0 ? (confGames[confGames.length - 1].cwv ?? null) : null;
    const parts: string[] = [];

    if (latestTwv !== null) {
      const v = signed(latestTwv);
      let twvDesc: string;
      if (latestTwv >= 3) twvDesc = `TWV is very strong at ${v}`;
      else if (latestTwv >= 1.5) twvDesc = `TWV is strong at ${v}`;
      else if (latestTwv >= 0.5) twvDesc = `TWV is a little ahead of the 50th-rated team's pace at ${v}`;
      else if (latestTwv > -0.5) twvDesc = `TWV is about even with the 50th-rated team's pace at ${v}`;
      else if (latestTwv > -1.5) twvDesc = `TWV is a bit behind the 50th-rated team's pace at ${v}`;
      else twvDesc = `TWV is well behind the 50th-rated team's pace at ${v}`;

      // Trend needs a few games to mean anything
      const twvValues = played
        .filter((g) => g.twv_50 !== undefined && g.twv_50 !== null)
        .map((g) => g.twv_50!);
      if (twvValues.length > 3) {
        const maxTwv = Math.max(...twvValues);
        const minTwv = Math.min(...twvValues);
        if (Math.abs(latestTwv - maxTwv) < 0.3) twvDesc += ", near its season high";
        else if (Math.abs(latestTwv - minTwv) < 0.3) twvDesc += ", near its season low";
        else if (latestTwv > twvValues[Math.floor(twvValues.length / 2)])
          twvDesc += " and trending up";
        else twvDesc += `, down from a peak of ${signed(maxTwv)}`;
      }

      const lead =
        played.length < 5
          ? `After ${played.length} game${played.length === 1 ? "" : "s"}, ${team}'s`
          : `${team}'s`;
      parts.push(`${lead} ${twvDesc}.`);
    }

    if (latestCwv !== null) {
      const v = signed(latestCwv);
      let cwvDesc: string;
      if (latestCwv >= 2) cwvDesc = `CWV is very strong at ${v}`;
      else if (latestCwv >= 1) cwvDesc = `CWV is strong at ${v}`;
      else if (latestCwv >= 0.3) cwvDesc = `CWV is solid at ${v}`;
      else if (latestCwv > -0.3) cwvDesc = `CWV is about even with a .500 conference team at ${v}`;
      else if (latestCwv > -1) cwvDesc = `CWV is a bit below a .500 conference team at ${v}`;
      else cwvDesc = `CWV is well below a .500 conference team at ${v}`;

      const cwvValues = confGames.map((g) => g.cwv!);
      if (cwvValues.length > 3 && Math.abs(latestCwv - Math.max(...cwvValues)) < 0.3) {
        cwvDesc += ", near its season high";
      }
      parts.push(`${cwvDesc}.`);
    } else {
      parts.push(`CWV starts with conference play.`);
    }

    return parts.join(" ");
  };

  return `${teamParagraph(awayTeam, awaySchedule)}\n\n${teamParagraph(homeTeam, homeSchedule)}`;
}
