// src/components/features/basketball/BballRegSeasonWinsTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { Standing } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

interface BballRegSeasonWinsTableProps {
  standings: Standing[];
  className?: string;
}

function BballRegSeasonWinsTable({
  standings,
  className,
}: BballRegSeasonWinsTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
    },
    [router]
  );

  const sortedTeams = useMemo(() => {
    return [...standings].sort(
      (a, b) =>
        (b.avg_projected_total_wins || 0) - (a.avg_projected_total_wins || 0)
    );
  }, [standings]);

  const maxWins = useMemo(() => {
    let max = 0;
    for (const team of standings) {
      if (team.total_wins_distribution) {
        const teamMax = Math.max(
          ...Object.keys(team.total_wins_distribution).map(Number)
        );
        if (teamMax > max) max = teamMax;
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
        No total wins data available
      </div>
    );
  }

  const firstColWidth = isMobile ? 60 : 70;
  const teamColWidth = isMobile ? 40 : 64;
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 40 : 48;
  const summaryRowHeight = isMobile ? 24 : 28;

  const tableClassName = cn(
    tableStyles.tableContainer,
    "total-wins-table",
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
              className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${
                isMobile ? "text-xs" : "text-sm"
              }`}
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                maxWidth: firstColWidth,
                height: headerHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderBottom: "2px solid #d1d5db",
              }}
            >
              Total Wins
            </th>
            {sortedTeams.map((team) => (
              <th
                key={team.team_name}
                className={`text-center font-normal bg-gray-50 cursor-pointer hover:bg-blue-50 ${
                  isMobile ? "text-xs" : "text-sm"
                }`}
                style={{
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  height: headerHeight,
                  border: "1px solid #e5e7eb",
                  borderBottom: "2px solid #d1d5db",
                  borderLeft: "none",
                }}
                onClick={() => navigateToTeam(team.team_name)}
              >
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
                    size={isMobile ? 16 : 20}
                  />
                  <div className="text-center leading-tight">
                    {team.team_name.length > 12
                      ? `${team.team_name.substring(0, 12)}...`
                      : team.team_name}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {winColumns.map((wins) => (
            <tr key={wins}>
              <td
                className={`sticky left-0 z-20 bg-white text-center font-medium ${
                  isMobile ? "text-xs" : "text-sm"
                }`}
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
                const probability = team.total_wins_distribution?.[wins] || 0;
                const percentage = Math.round(probability * 100);

                return (
                  <td
                    key={`${team.team_name}-${wins}`}
                    className={`text-center font-medium ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                    style={{
                      height: cellHeight,
                      width: teamColWidth,
                      minWidth: teamColWidth,
                      maxWidth: teamColWidth,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      ...getCellColor(probability),
                    }}
                  >
                    {percentage > 0 ? `${percentage}%` : ""}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Summary rows */}
          <tr className="bg-gray-50">
            <td
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-1 ${
                isMobile ? "text-xs" : "text-sm"
              }`}
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
              Avg Total Wins
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
                  borderTop: "none",
                  borderLeft: "none",
                  fontSize: isMobile ? "12px" : "14px",
                }}
              >
                {team.avg_projected_total_wins?.toFixed(1) || "0.0"}
              </td>
            ))}
          </tr>

          <tr className="bg-gray-50">
            <td
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-1 ${
                isMobile ? "text-xs" : "text-sm"
              }`}
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
              Current Total Record
            </td>
            {sortedTeams.map((team) => (
              <td
                key={`${team.team_name}-total-record`}
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
                {team.overall_record || "0-0"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default memo(BballRegSeasonWinsTable);
