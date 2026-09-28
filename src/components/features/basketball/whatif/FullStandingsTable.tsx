"use client";

// Every standing position, current vs what-if.

import { type WhatIfTeamResult } from "@/hooks/useBasketballWhatIf";
import { cn } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";
import styles from "./BasketballWhatIfScenarios.module.css";
import { ScreenshotBtn } from "./ScreenshotBtn";
import { TeamLogo } from "./icons";

// Full Standings Comparison Table with sortable headers (Change 7)
export function FullStandingsTable({
  baseline,
  whatif,
  numTeams,
  label,
  screenshotRef,
  selectionHtml,
}: {
  baseline: WhatIfTeamResult[];
  whatif: WhatIfTeamResult[];
  numTeams: number;
  label: string;
  screenshotRef: React.RefObject<HTMLDivElement | null>;
  selectionHtml: string | null;
}) {
  const [sortKey, setSortKey] = useState<string>("avg");
  const [sortAsc, setSortAsc] = useState(true);

  const baselineMap = useMemo(
    () => new Map(baseline.map((t) => [t.team_id, t])),
    [baseline],
  );
  const maxStandings = numTeams;

  const getProb = useCallback(
    (team: WhatIfTeamResult, standing: number): number => {
      const key = `standing_${standing}_prob`;
      return ((team as unknown as Record<string, unknown>)[key] as number) ?? 0;
    },
    [],
  );

  const sortedTeams = useMemo(() => {
    if (!whatif.length) return [];
    return [...whatif].sort((a, b) => {
      let aVal: number, bVal: number;
      if (sortKey === "avg") {
        aVal = a.avg_conference_standing ?? 99;
        bVal = b.avg_conference_standing ?? 99;
      } else if (sortKey === "wins") {
        aVal = a.avg_projected_conf_wins ?? 0;
        bVal = b.avg_projected_conf_wins ?? 0;
      } else if (sortKey.startsWith("s_")) {
        const standing = parseInt(sortKey.slice(2));
        aVal = getProb(a, standing);
        bVal = getProb(b, standing);
      } else {
        aVal = a.avg_conference_standing ?? 99;
        bVal = b.avg_conference_standing ?? 99;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [whatif, sortKey, sortAsc, getProb]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === "avg");
    }
  };

  const sortArrow = (key: string) =>
    sortKey === key ? (
      <svg
        className="ml-0.5 inline-block"
        width="7"
        height="7"
        viewBox="0 0 8 8"
        fill="currentColor"
      >
        {sortAsc ? (
          <polygon points="0,6 8,6 4,1" />
        ) : (
          <polygon points="0,2 8,2 4,7" />
        )}
      </svg>
    ) : null;

  const thSort =
    "text-center py-2 px-1.5 font-normal cursor-pointer hover:text-gray-800 dark:text-gray-100 select-none";

  if (!baseline.length || !whatif.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className={styles.subTitle}>{label}</h3>
        <div data-no-screenshot>
          <ScreenshotBtn
            targetRef={screenshotRef}
            filename={`${label.replace(/\s+/g, "_").toLowerCase()}.png`}
            selectionHtml={selectionHtml}
            chartTitle={label}
          />
        </div>
      </div>
      <div ref={screenshotRef}>
        <div
          className={cn(
            styles.scrollViewport,
            "overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg",
          )}
        >
          <table
            className={cn(styles.table, "text-xs")}
            style={{ width: "auto" }}
          >
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300">
                <th
                  className={cn(
                    styles.stickyCell,
                    "text-left py-2 px-2 font-normal",
                  )}
                >
                  Team
                </th>
                <th className={thSort} onClick={() => handleSort("wins")}>
                  Wins{sortArrow("wins")}
                </th>
                <th className={thSort} onClick={() => handleSort("avg")}>
                  Avg{sortArrow("avg")}
                </th>
                {Array.from({ length: maxStandings }, (_, i) => (
                  <th
                    key={i}
                    className={thSort}
                    onClick={() => handleSort(`s_${i + 1}`)}
                  >
                    {i + 1}
                    {i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"}
                    {sortArrow(`s_${i + 1}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team) => {
                const bl = baselineMap.get(team.team_id);
                const winsChange = bl
                  ? (team.avg_projected_conf_wins ?? 0) -
                    (bl.avg_projected_conf_wins ?? 0)
                  : 0;
                const avgChange = bl
                  ? (team.avg_conference_standing ?? 0) -
                    (bl.avg_conference_standing ?? 0)
                  : 0;
                const hasAvgChange = Math.abs(avgChange) > 0.01;
                return (
                  <tr key={team.team_id}>
                    <td className={cn(styles.stickyBodyCell, "py-0.5 px-2")}>
                      <div className="flex items-center gap-1.5">
                        <TeamLogo
                          src={team.logo_url}
                          alt={team.team_name}
                          size={16}
                        />
                        <span className="whitespace-nowrap hidden sm:inline">
                          {team.team_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ height: "2.35rem", padding: 0 }}>
                      <div className={cn(styles.heatTileStack, "tabular-nums")}>
                        <span>
                          {(team.avg_projected_conf_wins ?? 0).toFixed(1)}
                        </span>
                        <span
                          className={`text-[9px] ${Math.abs(winsChange) > 0.01 ? (winsChange > 0 ? "text-green-600" : "text-red-500") : "invisible"}`}
                        >
                          {Math.abs(winsChange) > 0.01
                            ? `${winsChange > 0 ? "+" : ""}${winsChange.toFixed(1)}`
                            : "\u00A0"}
                        </span>
                      </div>
                    </td>
                    <td style={{ height: "2.35rem", padding: 0 }}>
                      <div className={cn(styles.heatTileStack, "tabular-nums")}>
                        <span>
                          {(team.avg_conference_standing ?? 0).toFixed(1)}
                        </span>
                        <span
                          className={`text-[9px] ${hasAvgChange ? (avgChange < 0 ? "text-green-600" : "text-red-500") : "invisible"}`}
                        >
                          {hasAvgChange
                            ? `${avgChange > 0 ? "+" : ""}${avgChange.toFixed(1)}`
                            : "\u00A0"}
                        </span>
                      </div>
                    </td>
                    {Array.from({ length: maxStandings }, (_, i) => {
                      const standing = i + 1;
                      const val = getProb(team, standing);
                      const blVal = bl ? getProb(bl, standing) : val;
                      const delta = val - blVal;
                      const hasChange = Math.abs(delta) > 0.05;
                      return (
                        <td
                          key={standing}
                          style={{ height: "2.35rem", padding: 0 }}
                        >
                          <div
                            className={cn(styles.heatTileStack, "tabular-nums")}
                            style={{
                              backgroundColor: hasChange
                                ? delta > 0
                                  ? "rgba(40,167,69,0.08)"
                                  : "rgba(220,53,69,0.06)"
                                : "#e2e8f0",
                            }}
                          >
                            <span>
                              {val > 0 ? `${val.toFixed(1)}` : "\u00A0"}
                            </span>
                            <span
                              className={`text-[8px] ${hasChange ? (delta > 0 ? "text-green-600" : "text-red-500") : "invisible"}`}
                            >
                              {hasChange
                                ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`
                                : "\u00A0"}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
