"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { FootballStanding } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

interface FootballRegularSeasonWinsTableProps {
  standings: FootballStanding[];
  className?: string;
}

function FootballRegularSeasonWinsTable({
  standings,
  className,
}: FootballRegularSeasonWinsTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/football/team/${encodeURIComponent(teamName)}`);
    },
    [router]
  );

  // Sort teams by TWV (highest to lowest)
  const sortedTeams = useMemo(() => {
    return [...standings].sort(
      (a, b) => (b.reg_season_twv || 0) - (a.reg_season_twv || 0)
    );
  }, [standings]);

  const maxWins = useMemo(() => {
    let max = 0;
    for (const team of standings) {
      if (team.reg_wins_distribution) {
        const teamMax = Math.max(
          ...Object.keys(team.reg_wins_distribution).map(Number)
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
        No regular season wins data available
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
              className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${isMobile ? "text-xs px-1" : "text-sm px-2"}`}
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                maxWidth: firstColWidth,
                height: headerHeight,
                border: "1px solid #e5e7eb",
                borderBottom: "2px solid #d1d5db",
              }}
            >
              Wins
            </th>
            {sortedTeams.map((team, index) => (
              <th
                key={`header-${team.team_id}-${team.team_name}-${index}`}
                className={`text-center font-normal px-1 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  height: headerHeight,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderBottom: "2px solid #d1d5db",
                  backgroundColor: "#f9fafb",
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
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
          {winColumns.map((wins) => (
            <tr key={`reg-wins-${wins}`}>
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
              {sortedTeams.map((team, index) => {
                const percentage =
                  team.reg_wins_distribution?.[wins.toString()] || 0;
                const colorStyle = getCellColor(percentage);

                return (
                  <td
                    key={`${team.team_id}-${team.team_name}-reg-wins-${wins}-${index}`}
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

          {/* Avg row */}
          <tr className="bg-gray-50" key="avg-row">
            <td
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderTop: "2px solid #d1d5db",
              }}
            >
              Avg
            </td>
            {sortedTeams.map((team, index) => (
              <td
                key={`${team.team_id}-${team.team_name}-avg-reg-${index}`}
                className={`text-center font-medium ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "2px solid #d1d5db",
                  borderLeft: "none",
                  backgroundColor: "#f9fafb",
                }}
              >
                {(team.avg_reg_season_wins || 0).toFixed(1)}
              </td>
            ))}
          </tr>

          {/* Sag12 row */}
          <tr className="bg-gray-50" key="sag12-row">
            <td
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderTop: "none",
              }}
            >
              Est #12 Wins
            </td>
            {sortedTeams.map((team, index) => (
              <td
                key={`${team.team_id}-${team.team_name}-sag12-reg-${index}`}
                className={`text-center font-medium ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  backgroundColor: "#f9fafb",
                }}
              >
                {(team.avg_sag12_reg_season_wins || 0).toFixed(1)}
              </td>
            ))}
          </tr>

          {/* TWV row */}
          <tr className="bg-gray-50" key="twv-row">
            <td
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderTop: "none",
              }}
            >
              TWV
            </td>
            {sortedTeams.map((team, index) => (
              <td
                key={`${team.team_id}-${team.team_name}-twv-reg-${index}`}
                className={`text-center font-medium ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  backgroundColor: "#f9fafb",
                }}
              >
                {(team.reg_season_twv || 0).toFixed(1)}
              </td>
            ))}
          </tr>

          {/* Curr Record row */}
          <tr className="bg-gray-50" key="curr-record-row">
            <td
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderTop: "none",
              }}
            >
              Curr Record
            </td>
            {sortedTeams.map((team, index) => {
              const wins = team.actual_total_wins || 0;
              const losses = team.actual_total_losses || 0;
              return (
                <td
                  key={`${team.team_id}-${team.team_name}-curr-record-${index}`}
                  className={`text-center font-medium ${isMobile ? "text-xs" : "text-sm"}`}
                  style={{
                    height: summaryRowHeight,
                    width: teamColWidth,
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderLeft: "none",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  {wins}-{losses}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default memo(FootballRegularSeasonWinsTable);
