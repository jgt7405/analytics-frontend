"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { Standing } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

interface StandingsTableProps {
  standings: Standing[];
  className?: string;
}

function StandingsTable({ standings, className }: StandingsTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
    },
    [router],
  );

  const sortedTeams = useMemo(() => {
    const startTime = performance.now();
    const result = [...standings].sort((a, b) => {
      const aStanding = a.avg_standing ?? 999;
      const bStanding = b.avg_standing ?? 999;
      return aStanding - bStanding;
    });

    if (process.env.NODE_ENV === "development") {
      const duration = performance.now() - startTime;
      if (duration > 10) {
        console.log(
          `StandingsTable sort took ${duration.toFixed(2)}ms for ${standings.length} teams`,
        );
      }
    }
    return result;
  }, [standings]);

  const positions = useMemo(() => {
    const startTime = performance.now();
    let maxPosition = 0;

    for (const team of standings) {
      if (team.standings_distribution) {
        const teamMax = Math.max(
          ...Object.keys(team.standings_distribution).map(Number),
        );
        if (teamMax > maxPosition) maxPosition = teamMax;
      }
    }

    if (process.env.NODE_ENV === "development") {
      const duration = performance.now() - startTime;
      if (duration > 5) {
        console.log(
          `StandingsTable positions calculation took ${duration.toFixed(2)}ms`,
        );
      }
    }
    return Array.from({ length: Math.max(maxPosition, 1) }, (_, i) => i + 1);
  }, [standings]);

  if (!standings || standings.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No standings data available
      </div>
    );
  }

  // Responsive dimensions
  const firstColWidth = isMobile ? 60 : 80;
  const teamColWidth = isMobile ? 40 : 64;
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 40 : 48;
  const summaryRowHeight = isMobile ? 24 : 28;

  const tableClassName = cn(
    tableStyles.tableContainer,
    "standings-table",
    className,
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
              className={`sticky left-0 z-30 bg-gray-50 text-center font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
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
              Position
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
          {positions.map((position) => (
            <tr key={`position-${position}`}>
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
                {position}
              </td>
              {sortedTeams.map((team) => {
                const percentage = team.standings_distribution?.[position] || 0;
                const colorStyle = getCellColor(percentage);

                return (
                  <td
                    key={`${team.team_name}-position-${position}`}
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

          {/* Summary row */}
          <tr className="bg-gray-50">
            <td
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
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
              Avg Position
            </td>
            {sortedTeams.map((team) => (
              <td
                key={`${team.team_name}-avg-position`}
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
                {team.avg_standing?.toFixed(1) || "-"}
              </td>
            ))}
          </tr>

          {/* Curr Conf Record row */}
          <tr className="bg-gray-50">
            <td
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
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
                key={`${team.team_name}-conf-record`}
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
                {team.conference_record || "-"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default memo(StandingsTable);
