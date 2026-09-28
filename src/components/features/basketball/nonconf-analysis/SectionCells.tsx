"use client";

// One opponent group's four cells (Record, Win %, Exp Win %, TWV) in a
// conference row or a team row. Team rows use smaller, grayer text.

import type { CSSProperties } from "react";
import { expectedWinPct } from "./data";
import type { CellColors, TableSizes } from "./types";

interface SectionCellsProps {
  record: string;
  winPct: number;
  /** TWV as displayed (per team for conference rows). */
  twv: number;
  /** TWV behind the expected win % (the conference sum for conference rows). */
  expectedTwv: number;
  winPctColors: CellColors;
  twvColors: CellColors;
  isTeamRow: boolean;
  sizes: TableSizes;
}

export default function SectionCells({
  record,
  winPct,
  twv,
  expectedTwv,
  winPctColors,
  twvColors,
  isTeamRow,
  sizes,
}: SectionCellsProps) {
  const { isMobile, dataColWidth, cellHeight } = sizes;
  const fontSize = isTeamRow ? (isMobile ? "0.65rem" : "0.75rem") : isMobile ? "0.7rem" : "0.8rem";
  const base: CSSProperties = {
    width: dataColWidth,
    minWidth: dataColWidth,
    height: cellHeight,
    border: "1px solid var(--border-color)",
    borderTop: "none",
    borderLeft: "none",
    textAlign: "center",
    fontSize,
  };

  return (
    <>
      <td
        style={
          isTeamRow
            ? { ...base, color: "#6b7280", verticalAlign: "middle", backgroundColor: "#ffffff" }
            : { ...base, verticalAlign: "middle", backgroundColor: "#ffffff" }
        }
      >
        {record}
      </td>
      <td style={{ ...base, verticalAlign: "middle", ...winPctColors }}>{Math.round(winPct)}%</td>
      <td style={{ ...base, verticalAlign: "middle", backgroundColor: "#ffffff", color: "#111827" }}>
        {Math.round(expectedWinPct(record, expectedTwv))}
        %
      </td>
      <td style={{ ...base, verticalAlign: "middle", ...twvColors }}>
        {twv > 0 ? "+" : ""}
        {twv.toFixed(2)}
      </td>
    </>
  );
}
