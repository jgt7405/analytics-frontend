"use client";

// The two sticky header rows: opponent groups, then the sortable columns.

import type { CSSProperties } from "react";
import { COLUMNS } from "./data";
import type { ColumnType, SortField, TableSizes } from "./types";

const GROUP_TITLES: Record<ColumnType, string> = {
  power: "Power Conf Opponents",
  nonpower: "Non-Power Conf Opponents",
  total: "Total Non-Conference",
};

const SUB_COLUMNS = [
  { suffix: "record", key: "record", label: "Record" },
  { suffix: "win_pct", key: "winpct", label: "Win %" },
  { suffix: "exp_win_pct", key: "expwin", label: "Exp Win %" },
  { suffix: "twv_50", key: "twv", label: "TWV" },
] as const;

interface HeaderRowsProps {
  sizes: TableSizes;
  onSort: (field: SortField) => void;
  sortIndicator: (field: SortField) => string | null;
}

export default function HeaderRows({ sizes, onSort, sortIndicator }: HeaderRowsProps) {
  const { isMobile, expandColWidth, confColWidth, dataColWidth, headerHeight } = sizes;

  const groupStyle: CSSProperties = {
    position: "sticky",
    top: -1,
    zIndex: 31,
    overflow: "hidden",
    height: headerHeight,
    backgroundColor: "#ffffff",
    border: "1px solid var(--border-color)",
    borderLeft: "none",
    boxShadow: "inset 0 -2px 0 0 var(--border-color)",
    fontSize: isMobile ? "0.75rem" : "0.875rem",
    fontWeight: 400,
    textAlign: "center",
    verticalAlign: "middle",
  };

  const subStyle: CSSProperties = {
    width: dataColWidth,
    minWidth: dataColWidth,
    height: headerHeight * 0.65,
    position: "sticky",
    top: headerHeight - 4,
    zIndex: 31,
    overflow: "hidden",
    backgroundColor: "#f9fafb",
    border: "1px solid var(--border-color)",
    borderLeft: "none",
    borderTop: "none",
    boxShadow: "inset 0 -2px 0 0 var(--border-color)",
    fontSize: "0.7rem",
    fontWeight: 400,
    color: "#4b5563",
    textAlign: "center",
    verticalAlign: "middle",
    padding: "2px",
    cursor: "pointer",
  };

  return (
    <>
      <tr key="header-row-1">
        <th
          key="expand-col-1"
          style={{
            width: expandColWidth,
            minWidth: expandColWidth,
            height: headerHeight,
            position: "sticky",
            top: -1,
            left: -1,
            zIndex: 32,
            overflow: "hidden",
            backgroundColor: "#ffffff",
            border: "1px solid var(--border-color)",
            boxShadow: "inset -2px -2px 0 0 var(--border-color)",
          }}
        ></th>
        <th
          key="conf-col-1"
          style={{
            width: confColWidth,
            minWidth: confColWidth,
            height: headerHeight,
            position: "sticky",
            top: -1,
            left: expandColWidth - 1,
            zIndex: 32,
            overflow: "hidden",
            backgroundColor: "#ffffff",
            border: "1px solid var(--border-color)",
            borderLeft: "none",
            boxShadow: "inset -2px 0 0 0 var(--border-color)",
            fontSize: isMobile ? "0.75rem" : "0.875rem",
            fontWeight: 400,
            textAlign: "center",
            verticalAlign: "middle",
            padding: "8px",
          }}
        >
          {!isMobile && "Conference"}
        </th>
        {COLUMNS.map((column) => (
          <th key={`${column}-col-1`} colSpan={4} style={groupStyle}>
            {GROUP_TITLES[column]}
          </th>
        ))}
      </tr>
      <tr key="header-row-2">
        <th
          key="expand-col-2"
          style={{
            width: expandColWidth,
            minWidth: expandColWidth,
            height: headerHeight * 0.65,
            position: "sticky",
            top: headerHeight - 4,
            left: -1,
            zIndex: 32,
            overflow: "hidden",
            backgroundColor: "#f9fafb",
            border: "1px solid var(--border-color)",
            borderTop: "none",
            boxShadow: "inset -2px 0 0 0 var(--border-color)",
            fontSize: "0.7rem",
            fontWeight: 400,
          }}
        ></th>
        <th
          key="conf-col-2"
          style={{
            width: confColWidth,
            minWidth: confColWidth,
            height: headerHeight * 0.65,
            position: "sticky",
            top: headerHeight - 4,
            left: expandColWidth - 1,
            zIndex: 32,
            overflow: "hidden",
            backgroundColor: "#f9fafb",
            border: "1px solid var(--border-color)",
            borderLeft: "none",
            borderTop: "none",
            boxShadow: "inset -2px 0 0 0 var(--border-color)",
            fontSize: "0.7rem",
            fontWeight: 400,
          }}
        ></th>
        {COLUMNS.flatMap((column) =>
          SUB_COLUMNS.map(({ suffix, key, label }) => {
            const field = `${column}_${suffix}` as SortField;
            return (
              <th key={`${column}-${key}-2`} style={subStyle} onClick={() => onSort(field)}>
                {label}
                {sortIndicator(field)}
              </th>
            );
          }),
        )}
      </tr>
    </>
  );
}
