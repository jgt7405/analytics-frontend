// Record and form metrics, conference position, and small text helpers.

import { type ComputedMetrics, type ConferenceStandingsTeam, type TeamGameData, type TeamInfo } from "@/types/gamePreview";

export const TEAL = "#0097b2";

// ─── Utility Functions ───────────────────────────────────────────────────────

export function computeMetrics(
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

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Capitalize the first letter of a string. */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function getLogoUrl(filename?: string): string | undefined {
  if (!filename) return undefined;
  if (filename.startsWith("http") || filename.startsWith("/")) return filename;
  return `/images/team_logos/${filename}`;
}

export function computeConfPosition(
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


/** Helper to get a readable location phrase from a location filter string. */
export function locationPhrase(locLabel: string): string {
  if (locLabel === "home") return "at home";
  if (locLabel === "neutral") return "on neutral courts";
  return "on the road";
}
