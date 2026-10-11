// Horizontal offsets for logos stacked on one vertical axis (a swim lane),
// so logos at nearly the same value don't sit on top of each other. Each
// logo keeps its exact vertical position; only its x offset changes.
//
//   alone              centered
//   two close          one left, one right, side by side
//   three or more      three slots across (left, center, right) with a
//                      little overlap; each logo takes the first slot whose
//                      previous occupant is far enough above it, so a long
//                      run of close values zigzags instead of piling up

export interface LaneItem {
  id: string;
  /** Vertical position in px (larger is lower). */
  y: number;
}

export interface LaneLogoPosition {
  id: string;
  y: number;
  /** Offset of the logo's center from the lane's center, in px. */
  x: number;
}

/** Two logos whose centers are closer than this (as a share of the logo size) collide. */
const COLLISION_RATIO = 0.9;
/** Distance between the three slots, as a share of the logo size (< 1 overlaps). */
const THREE_SLOT_STEP_RATIO = 0.75;

export function layoutLaneLogos(items: LaneItem[], logoPx: number): LaneLogoPosition[] {
  const minGap = logoPx * COLLISION_RATIO;
  const sorted = [...items].sort((a, b) => a.y - b.y);

  // Runs of logos that each collide with the one before them.
  const clusters: LaneItem[][] = [];
  for (const item of sorted) {
    const current = clusters[clusters.length - 1];
    if (current && item.y - current[current.length - 1].y < minGap) {
      current.push(item);
    } else {
      clusters.push([item]);
    }
  }

  const positions: LaneLogoPosition[] = [];
  for (const cluster of clusters) {
    if (cluster.length === 1) {
      positions.push({ ...cluster[0], x: 0 });
      continue;
    }
    if (cluster.length === 2) {
      // Just far enough apart not to touch.
      const half = logoPx * 0.5 + 1;
      positions.push({ ...cluster[0], x: -half }, { ...cluster[1], x: half });
      continue;
    }

    const step = logoPx * THREE_SLOT_STEP_RATIO;
    // Preference order: center, then left, then right.
    const slots = [0, -step, step];
    const lastY: Array<number | null> = [null, null, null];
    for (const item of cluster) {
      let chosen = slots.findIndex(
        (_, i) => lastY[i] === null || item.y - (lastY[i] as number) >= minGap,
      );
      if (chosen === -1) {
        // Every slot is crowded: take the one whose last logo is farthest up.
        chosen = lastY.reduce<number>(
          (best, y, i) => ((y as number) < (lastY[best] as number) ? i : best),
          0,
        );
      }
      lastY[chosen] = item.y;
      positions.push({ ...item, x: slots[chosen] });
    }
  }
  return positions;
}
