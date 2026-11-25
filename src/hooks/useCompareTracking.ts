import { useCallback, useEffect, useRef } from "react";

type Sport = "basketball" | "football";
type Method = "pick" | "rank";

/**
 * Counts teams added on a Compare Schedules page for the compare analytics
 * dashboards (/basketball/compareanalysis, /football/compareanalysis).
 *
 * Pass the selected team names in selection order. Each team that appears
 * sends one anonymous "compare" event with the teams on the page at that
 * moment (ending with the new one), so the backend can count picks and which
 * teams are compared with each other. Removals are not sent.
 *
 * Returns `markRankAdd`: call it right before a state update that adds teams
 * from a ranking quick-select, so those adds are told apart from hand picks.
 */
export function useCompareTracking(sport: Sport, teamNames: readonly string[]) {
  const previous = useRef<string[]>([]);
  const nextMethod = useRef<Method>("pick");
  const key = teamNames.join("\u0000");

  useEffect(() => {
    const names = key ? key.split("\u0000") : [];
    const before = new Set(previous.current);
    previous.current = names;
    const method = nextMethod.current;
    nextMethod.current = "pick";
    // New teams are appended, so each one's comparison is the list up to it.
    const comparisons = names
      .map((name, index) => (before.has(name) ? null : names.slice(0, index + 1)))
      .filter((teams): teams is string[] => teams !== null);
    if (!comparisons.length) return;
    void import("@/lib/usage-tracking")
      .then(({ trackCompare }) => comparisons.forEach((teams) => trackCompare(sport, teams, method)))
      .catch(() => undefined);
  }, [key, sport]);

  return useCallback(() => {
    nextMethod.current = "rank";
  }, []);
}
