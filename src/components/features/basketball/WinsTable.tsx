"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { Standing } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

interface WinsTableProps {
  standings: Standing[];
  className?: string;
}

function WinsTable({ standings, className }: WinsTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
    },
    [router]
  );

  const sortedTeams = useMemo(() => {
    const startTime = performance.now();
    const result = [...standings].sort(
      (a, b) =>
        (b.avg_projected_conf_wins || 0) - (a.avg_projected_conf_wins || 0)
    );

    if (process.env.NODE_ENV === "development") {
      const duration = performance.now() - startTime;
      if (duration > 10) {
        console.log(
          `WinsTable sort took ${duration.toFixed(2)}ms for ${standings.length} teams`
        );
      }
    }

    return result;
  }, [standings]);

  const maxWins = useMemo(() => {
    const startTime = performance.now();
    let max = 0;

    for (const team of standings) {
      if (team.conf_wins_distribution) {
        const teamMax = Math.max(
          ...Object.keys(team.conf_wins_distribution).map(Number)
        );
        if (teamMax > max) max = teamMax;
      }
    }

    if (process.env.NODE_ENV === "development") {
      const duration = performance.now() - startTime;
      if (duration > 5) {
        console.log(`WinsTable max calculation took ${duration.toFixed(2)}ms`);
      }
    }

    return max;
  }, [standings]);

  const winColumns = useMemo(
    () => Array.from({ length: maxWins + 1 }, (_, i) => maxWins - i),
    [maxWins]
  );

  if (!standings || standings.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No wins data available
      </div>
    );
  }

  // CWV-style dimensions
  const firstColWidth = isMobile ? 60 : 70;
  const teamColWidth = isMobile ? 40 : 64;
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 40 : 48;
  const summaryRowHeight = isMobile ? 24 : 28;

  const tableClassName = cn(
    tableStyles.tableContainer,
    "wins-table",
    className
  );

  return (
    <div className={`${tableClassName} relative overflow-x-auto`}>
      <table
        className="border-collapse border-spacing-0"
        style={{
          width: "max-content",
          borderCollapse: "separate",
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr>
            <th
              className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                maxWidth: firstColWidth,
                height: headerHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              Conference Wins
            </th>
            {sortedTeams.map((team) => (
              <th
                key={team.team_name}
                className="bg-gray-50 text-center font-normal"
                style={{
                  height: headerHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                }}
              >
                <div
                  className="flex justify-center items-center h-full cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToTeam(team.team_name);
                  }}
                >
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
                    size={isMobile ? 24 : 28}
                    className="flex-shrink-0"
                    onClick={() => navigateToTeam(team.team_name)}
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {winColumns.map((wins) => (
            <tr key={`wins-row-${wins}`}>
              <td
                className={`sticky left-0 z-20 bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: firstColWidth,
                  minWidth: firstColWidth,
                  maxWidth: firstColWidth,
                  height: cellHeight,
                  position: "sticky",
                  left: 0,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                {wins}
              </td>
              {sortedTeams.map((team) => {
                const percentage = team.conf_wins_distribution?.[wins] || 0;
                const colorStyle = getCellColor(percentage);

                return (
                  <td
                    key={`${team.team_name}-${wins}`}
                    className="relative p-0"
                    style={{
                      height: cellHeight,
                      width: teamColWidth,
                      minWidth: teamColWidth,
                      maxWidth: teamColWidth,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      backgroundColor: colorStyle.backgroundColor,
                      color: colorStyle.color,
                    }}
                  >
                    <div
                      className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                    >
                      {percentage > 0 ? `${Math.round(percentage)}%` : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Summary rows */}
          <tr className="bg-gray-50">
            <td
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-1 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                maxWidth: firstColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderTop: "2px solid #4b5563",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              Avg Conf Wins
            </td>
            {sortedTeams.map((team) => (
              <td
                key={`${team.team_name}-avg`}
                className="bg-gray-50 text-center"
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "2px solid #4b5563",
                  borderLeft: "none",
                  fontSize: isMobile ? "12px" : "14px",
                }}
              >
                {team.avg_projected_conf_wins?.toFixed(1) || "0.0"}
              </td>
            ))}
          </tr>

          <tr className="bg-gray-50">
            <td
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-1 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                maxWidth: firstColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderTop: "none",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              Curr Conf Record
            </td>
            {sortedTeams.map((team) => (
              <td
                key={`${team.team_name}-record`}
                className="bg-gray-50 text-center"
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  fontSize: isMobile ? "12px" : "14px",
                }}
              >
                {team.record || "0-0"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default memo(WinsTable);
