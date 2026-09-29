// Data the basketball game preview loads besides the two teams' pages:
// upcoming games, conference standings, conference-tournament analysis and
// next-game impact.
import { apiUrl } from "@/api/urls";
import type { ConfChampData, ConferenceStandingsTeam, NextGameImpactData, UpcomingGame } from "@/types/gamePreview";

/** Upcoming games and their conferences; throws when the request fails. */
export async function fetchUpcomingGames(): Promise<{ games?: UpcomingGame[]; conferences?: string[] }> {
  const response = await fetch(apiUrl("basketball.upcomingGames"));
  if (!response.ok) throw new Error("Failed to fetch upcoming games");
  return response.json();
}

export async function fetchConferenceStandings(
  conference: string,
): Promise<ConferenceStandingsTeam[]> {
  try {
    const confFormatted = conference.replace(/ /g, "_");
    const response = await fetch(
      apiUrl("basketball.standings", { conference: confFormatted }), // ← CORRECT endpoint (has conference_wins/losses)
    );
    if (!response.ok) return [];
    const json = await response.json();
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

export async function fetchConfChampDataForTeam(
  conference: string,
  teamName: string,
): Promise<ConfChampData | null> {
  try {
    const confFormatted = conference.replace(/\s+/g, "_");
    const response = await fetch(
      apiUrl("basketball.confChampAnalysis", { conference: confFormatted }),
    );
    if (!response.ok) return null;
    const result = await response.json();
    if (result.data && Array.isArray(result.data)) {
      return (
        result.data.find((t: ConfChampData) => t.team_name === teamName) || null
      );
    }
    return null;
  } catch {
    return null;
  }
}


/** What a win or loss in the team's next game changes; null on failure. */
export async function fetchNextGameImpact(conf: string, teamId: string): Promise<NextGameImpactData | null> {
  try {
    const resp = await fetch(apiUrl("basketball.nextGameImpact"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conference: conf,
        team_id: parseInt(teamId),
      }),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
