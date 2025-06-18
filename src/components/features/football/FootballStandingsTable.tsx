"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { FootballStanding } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

interface FootballStandingsTableProps {
  standings: FootballStanding[];
  className?: string;
}

function FootballStandingsTable({
  standings,
  className,
}: FootballStandingsTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/football/team/${encodeURIComponent(teamName)}`);
    },
    [router]
  );

  const sortedTeams = useMemo(() => {
    return [...standings].sort((a, b) => {
      const aStanding = a.avg_standing ?? 999;
      const bStanding = b.avg_standing ?? 999;
      return aStanding - bStanding;
    });
  }, [standings]);

  const positions = useMemo(() => {
    let maxPosition = 0;

    for (const team of standings) {
      if (team.standings_distribution) {
        const validPositions = Object.keys(team.standings_distribution)
          .map((key) => parseFloat(key))
          .filter((pos) => !isNaN(pos) && isFinite(pos) && pos > 0);

        if (validPositions.length > 0) {
          const teamMax = Math.max(...validPositions);
          if (teamMax > maxPosition) maxPosition = teamMax;
        }
      }
    }

    return Array.from({ length: Math.max(maxPosition, 1) }, (_, i) => i + 1);
  }, [standings]);

  if (!standings || standings.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No football standings data available
      </div>
    );
  }

  const firstColWidth = isMobile ? 60 : 80;
  const teamColWidth = isMobile ? 40 : 64;
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 40 : 48;
  const summaryRowHeight = isMobile ? 20 : 24;

  return (
    <div className={cn(tableStyles.tableContainer, className)}>
      <table
        className={tableStyles.standingsTable}
        style={{
          tableLayout: "fixed",
          borderCollapse: "separate",
          borderSpacing: 0,
          width: firstColWidth + sortedTeams.length * teamColWidth,
        }}
      >
        <thead>
          <tr>
            <th
              className="sticky left-0 z-30 bg-white text-center border border-gray-300"
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                maxWidth: firstColWidth,
                height: headerHeight,
                position: "sticky",
                left: 0,
                borderRight: "1px solid #e5e7eb",
              }}
            >
              <div
                className={`${isMobile ? "text-xs" : "text-sm"} font-medium text-gray-700`}
              >
                Position
              </div>
            </th>
            {sortedTeams.map((team) => (
              <th
                key={`header-${team.team_id}-${team.team_name}`}
                className="border border-gray-300 border-l-0 bg-white p-0"
                style={{
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  height: headerHeight,
                }}
              >
                <div className="flex flex-col items-center justify-center h-full px-1">
                  <TeamLogo
                    teamName={team.team_name}
                    logoUrl={team.logo_url}
                    size={isMobile ? 20 : 24}
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
                const percentage =
                  team.standings_distribution?.[position.toString()] ||
                  team.standings_distribution?.[`${position}.0`] ||
                  0;
                const colorStyle = getCellColor(percentage);

                return (
                  <td
                    key={`${team.team_id}-${team.team_name}-position-${position}`}
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
                key={`${team.team_id}-${team.team_name}-avg-position`}
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
        </tbody>
      </table>
    </div>
  );
}

export default memo(FootballStandingsTable);
