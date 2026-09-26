// The chart page's "Download Team Schedule": every basketball team's current
// schedule as a CSV file, built by the backend.
import { proxyUrl } from "@/lib/proxy-url";

/** Fetches the CSV; throws on failure. The filename comes from the
 *  backend's Content-Disposition (it carries the date). */
export async function fetchTeamScheduleCsv(): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(proxyUrl("basketball/team_schedule/csv"));
  if (!response.ok) {
    throw new Error(`Failed to fetch team schedule: ${response.status}`);
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename =
    /filename="([^"]+)"/.exec(disposition)?.[1] ??
    `bball_team_schedule_${new Date().toISOString().split("T")[0]}.csv`;
  return { blob: await response.blob(), filename };
}
