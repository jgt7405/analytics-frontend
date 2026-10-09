import { Standing } from "@/types/basketball";

/**
 * Current conference record for the standings tables, formatted the same way
 * as the football standings tables: "W-L (.pct)", or just "W-L" before any
 * conference games are played. Uses conference_wins/losses when present and
 * falls back to parsing the conference_record string; "-" when neither exists.
 */
export function formatConfRecord(team: Standing): string {
  let wins: number | undefined;
  let losses: number | undefined;

  if (team.conference_wins != null && team.conference_losses != null) {
    wins = team.conference_wins;
    losses = team.conference_losses;
  } else if (team.conference_record) {
    const [w, l] = team.conference_record
      .split("-")
      .map((part) => Number.parseInt(part, 10));
    if (Number.isFinite(w) && Number.isFinite(l)) {
      wins = w;
      losses = l;
    }
  }

  if (wins === undefined || losses === undefined) {
    return team.conference_record || "-";
  }

  const games = wins + losses;
  if (games === 0) return `${wins}-${losses}`;
  const pct = wins / games;
  return `${wins}-${losses} (${pct.toFixed(3).replace(/^0/, "")})`;
}
