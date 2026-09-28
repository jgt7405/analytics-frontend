// Types shared by the what-if tables.

import { type WhatIfTeamResult } from "@/hooks/useBasketballWhatIf";

export type SortCol = "before" | "after" | "change" | null;
export type SortDir = "asc" | "desc";

/** Extra trailing column. Reads the displayed row (what-if once calculated,
 *  current before), so it always describes the same state as "What If". */
export interface ExtraColumn {
  key: string;
  label: string;
  value: (t: WhatIfTeamResult) => number | null | undefined;
  format: (v: number) => string;
  /** Heat-tile colour for the value; omit for plain text. */
  color?: (v: number) => React.CSSProperties;
}
