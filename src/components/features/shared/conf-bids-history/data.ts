import type { ConferenceEnd, ConfHistoryRow } from "./types";

/** Drops FCS conferences (football's CFP chart covers FBS only). */
export function withoutFcs(rows: ConfHistoryRow[]): ConfHistoryRow[] {
  return rows.filter((row) => !row.conference.toLowerCase().includes("fcs"));
}

/**
 * One row per conference and date: the first seen, replaced by any row with
 * an earlier version_id.
 */
export function dedupeByVersion(rows: ConfHistoryRow[]): ConfHistoryRow[] {
  const byConfAndDate = new Map<string, ConfHistoryRow>();
  rows.forEach((row) => {
    const key = `${row.conference}-${row.date}`;
    const kept = byConfAndDate.get(key);
    if (
      !kept ||
      (row.version_id && kept.version_id && row.version_id < kept.version_id)
    ) {
      byConfAndDate.set(key, row);
    }
  });
  return Array.from(byConfAndDate.values());
}

export interface LogoPosition {
  conf: ConferenceEnd;
  idealY: number;
  adjustedY: number;
}

/**
 * Vertical positions for the end-of-line logos: each at its line's end,
 * kept inside the plot (a logo's height above the bottom), then pushed up
 * until it is at least `minSpacing` above the logo below it.
 */
export function layoutEndLogos(
  conferences: ConferenceEnd[],
  yFor: (bids: number) => number,
  { top, bottom }: { top: number; bottom: number },
  minSpacing: number,
  logoHeight = 24,
): LogoPosition[] {
  const positions = conferences.map((conf) => ({
    conf,
    idealY: yFor(conf.final_bids),
    adjustedY: yFor(conf.final_bids),
  }));

  // If only one conference is selected, don't adjust - use ideal position
  if (positions.length === 1) {
    return positions;
  }

  // Sort by final_bids descending (highest to lowest) to stack from top
  positions.sort((a, b) => b.conf.final_bids - a.conf.final_bids);

  // Adjust for collisions, working from the bottom logo up
  for (let i = positions.length - 1; i >= 0; i--) {
    if (positions[i].adjustedY > bottom - logoHeight) {
      positions[i].adjustedY = bottom - logoHeight;
    }
    if (positions[i].adjustedY < top) {
      positions[i].adjustedY = top;
    }

    // Keep clear of the logo below (higher index, lower on chart)
    if (i < positions.length - 1) {
      const lowerLogo = positions[i + 1];
      const minY = lowerLogo.adjustedY - minSpacing;
      if (positions[i].adjustedY > minY) {
        positions[i].adjustedY = minY;
      }
    }
  }

  return positions;
}
