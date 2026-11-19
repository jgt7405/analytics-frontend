"use client";

// One opponent group's four cells (Record, Win %, Exp Win %, TWV) in a
// conference row or a team row. Team rows use smaller, grayer text. A group
// with no games shows a dash in each cell.

import type { CSSProperties } from "react";
import { expectedWinPct } from "./data";
import type { SectionValues, TableSizes } from "./types";

/** "+0.25", "-0.10", and "0.00" for anything that rounds to zero (not "-0.00"). */
function formatTwv(twv: number): string {
  const shown = twv.toFixed(2);
  if (Number(shown) === 0) return "0.00";
  return twv > 0 ? `+${shown}` : shown;
}

interface SectionCellsProps extends Omit<SectionValues, "key"> {
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
  empty = false,
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

  if (empty) {
    const blank: CSSProperties = {
      ...base,
      verticalAlign: "middle",
      backgroundColor: "#ffffff",
      color: "#9ca3af",
    };
    return (
      <>
        {["record", "win", "exp", "twv"].map((cell) => (
          <td key={cell} style={blank}>
            –
          </td>
        ))}
      </>
    );
  }

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
        {formatTwv(twv)}
      </td>
    </>
  );
}
