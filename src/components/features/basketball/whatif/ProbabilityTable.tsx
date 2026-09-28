"use client";

// Current vs what-if probability table (1st seed, top 4, top 8, NCAA bid).

import { type WhatIfTeamResult } from "@/hooks/useBasketballWhatIf";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import styles from "./BasketballWhatIfScenarios.module.css";
import { ScreenshotBtn } from "./ScreenshotBtn";
import { getDeltaColor } from "./helpers";
import { TeamLogo } from "./icons";
import { type ExtraColumn, type SortCol, type SortDir } from "./types";

// – Probability Table (reusable for 1st, Top 4, Top 8) –
// Change 5: sortable column headers
// Change 6: "After" → "What If"
// Change 9: no bold in data cells

export function ProbabilityTable({
  title,
  baseline,
  whatif,
  probFn,
  hasCalculated,
  screenshotRef,
  screenshotFilename,
  selectionHtml,
  isDark,
  extraColumns = [],
  headerRight,
}: {
  title: string;
  baseline: WhatIfTeamResult[];
  whatif: WhatIfTeamResult[];
  probFn: (t: WhatIfTeamResult) => number;
  hasCalculated: boolean;
  screenshotRef: React.RefObject<HTMLDivElement | null>;
  screenshotFilename: string;
  selectionHtml: string | null;
  isDark: boolean;
  extraColumns?: ExtraColumn[];
  /** Controls rendered next to the screenshot button (e.g. a view toggle). */
  headerRight?: React.ReactNode;
}) {
  const [sortCol, setSortCol] = useState<SortCol>("after");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const baselineMap = useMemo(
    () => new Map(baseline.map((t) => [t.team_id, t])),
    [baseline],
  );

  const rows = useMemo(() => {
    const src = hasCalculated ? whatif : baseline;
    return [...src]
      .sort(
        (a, b) =>
          (a.avg_conference_standing ?? 99) - (b.avg_conference_standing ?? 99),
      )
      .map((team) => {
        const bl = baselineMap.get(team.team_id);
        const before = bl ? probFn(bl) : 0;
        const after = probFn(team);
        return { team, before, after, change: after - before };
      });
  }, [baseline, whatif, hasCalculated, baselineMap, probFn]);

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [rows, sortCol, sortDir]);

  const maxAbs = useMemo(
    () => Math.max(...rows.map((r) => Math.abs(r.change)), 1),
    [rows],
  );

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const sortIndicator = (col: SortCol) =>
    sortCol === col ? (
      <svg
        className="ml-0.5 inline-block"
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="currentColor"
      >
        {sortDir === "desc" ? (
          <polygon points="0,2 8,2 4,7" />
        ) : (
          <polygon points="0,6 8,6 4,1" />
        )}
      </svg>
    ) : null;

  const thClass =
    "text-center py-2 px-2 font-normal cursor-pointer hover:text-gray-800 dark:text-gray-100 select-none";

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className={styles.subTitle}>{title}</h3>
        <div className="flex items-center gap-2" data-no-screenshot>
          {headerRight}
          <ScreenshotBtn
            targetRef={screenshotRef}
            filename={screenshotFilename}
            selectionHtml={selectionHtml}
            chartTitle={title}
          />
        </div>
      </div>
      <div ref={screenshotRef} className="overflow-x-auto">
        <table
          className={cn(styles.table, "text-sm")}
          style={{ width: "auto", minWidth: "320px" }}
        >
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300">
              <th
                className="text-left py-2 px-2 font-normal"
                style={{ minWidth: "40px" }}
              >
                Team
              </th>
              {hasCalculated ? (
                <>
                  <th
                    className={thClass}
                    style={{ minWidth: "70px" }}
                    onClick={() => handleSort("before")}
                  >
                    Current{sortIndicator("before")}
                  </th>
                  <th
                    className={thClass}
                    style={{ minWidth: "70px" }}
                    onClick={() => handleSort("after")}
                  >
                    What If{sortIndicator("after")}
                  </th>
                  <th
                    className={thClass}
                    style={{ minWidth: "70px" }}
                    onClick={() => handleSort("change")}
                  >
                    Change{sortIndicator("change")}
                  </th>
                </>
              ) : (
                <th className="text-center py-2 px-2 font-normal">Current %</th>
              )}
              {extraColumns.map((col) => (
                <th
                  key={col.key}
                  className="text-center py-2 px-2 font-normal whitespace-nowrap"
                  style={{ minWidth: "62px" }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ team, before, after, change }) => (
              <tr key={team.team_id} className="border-b border-gray-100">
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        backgroundColor: isDark ? "white" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <TeamLogo
                        src={team.logo_url}
                        alt={team.team_name}
                        size={18}
                      />
                    </div>
                    <span className="text-sm hidden sm:inline">
                      {team.team_name}
                    </span>
                  </div>
                </td>
                {hasCalculated ? (
                  <>
                    <td style={{ height: "2.1rem", padding: 0 }}>
                      <div
                        className={cn(styles.heatTile, "tabular-nums text-sm")}
                        style={getCellColor(before, "blue")}
                      >
                        {before > 0 ? `${before.toFixed(1)}%` : ""}
                      </div>
                    </td>
                    <td style={{ height: "2.1rem", padding: 0 }}>
                      <div
                        className={cn(styles.heatTile, "tabular-nums text-sm")}
                        style={getCellColor(after, "blue")}
                      >
                        {after > 0 ? `${after.toFixed(1)}%` : ""}
                      </div>
                    </td>
                    <td style={{ height: "2.1rem", padding: 0 }}>
                      <div
                        className={cn(styles.heatTile, "tabular-nums text-sm")}
                        style={getDeltaColor(change, maxAbs)}
                      >
                        {Math.abs(change) < 0.05 ? (
                          <span style={{ color: "#9ca3af" }}>&mdash;</span>
                        ) : change > 0 ? (
                          `+${change.toFixed(1)}%`
                        ) : (
                          `${change.toFixed(1)}%`
                        )}
                      </div>
                    </td>
                  </>
                ) : (
                  <td style={{ height: "2.1rem", padding: 0 }}>
                    <div
                      className={cn(styles.heatTile, "tabular-nums text-sm")}
                      style={getCellColor(before, "blue")}
                    >
                      {before > 0 ? `${before.toFixed(1)}%` : ""}
                    </div>
                  </td>
                )}
                {extraColumns.map((col) => {
                  const v = col.value(team);
                  const has = v !== null && v !== undefined && v > 0;
                  return (
                    <td key={col.key} style={{ height: "2.1rem", padding: 0 }}>
                      <div
                        className={cn(styles.heatTile, "tabular-nums text-sm")}
                        style={has && col.color ? col.color(v) : undefined}
                      >
                        {has ? col.format(v) : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
