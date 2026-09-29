// Summary of TWV and CWV over the season.

import { type TeamGameData } from "@/types/gamePreview";

export function buildWinValuesNarrative(
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

    const latestTwv = completed[completed.length - 1].twv_50 ?? null;
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
        twvDesc = `TWV is a little above what would be expected by the 50th rated team, at ${twvSign}${latestTwv.toFixed(1)}`;
      else if (latestTwv > -0.5)
        twvDesc = `TWV is roughly in line with what the 50th rated team would expect, at ${twvSign}${latestTwv.toFixed(1)}`;
      else if (latestTwv > -1.5)
        twvDesc = `TWV is a bit below expectations at ${latestTwv.toFixed(1)}`;
      else
        twvDesc = `TWV is well below expectations at ${latestTwv.toFixed(1)}`;

      // Find TWV peak and trough for trend
      const twvValues = completed
        .filter((g) => g.twv_50 !== undefined && g.twv_50 !== null)
        .map((g) => g.twv_50!);
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
