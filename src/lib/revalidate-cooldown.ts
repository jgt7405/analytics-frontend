// Keeps repeat calls to /api/revalidate cheap: a sport cleared in the last
// COOLDOWN_MS is not cleared again by the same server instance. The route
// takes no secret, so this is its only brake.
import type { Sport } from "@/config/seasons";

export const COOLDOWN_MS = 60_000;
const lastCleared = new Map<Sport, number>();

/** True (and starts the cooldown) when the sport may be cleared now. */
export function claimClear(sport: Sport, now: number): boolean {
  const last = lastCleared.get(sport);
  if (last !== undefined && now - last < COOLDOWN_MS) return false;
  lastCleared.set(sport, now);
  return true;
}

/** Test hook: forget when each sport was last cleared. */
export function resetCooldown() {
  lastCleared.clear();
}
