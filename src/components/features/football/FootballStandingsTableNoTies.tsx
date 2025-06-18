"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { FootballStanding } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

interface FootballStandingsTableNoTiesProps {
  standings: FootballStanding[];
  className?: string;
}

function FootballStandingsTableNoTies({
  standings,
  className,
}: FootballStandingsTableNoTiesProps) {
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
      const aStanding = a.conf_standing_no_ties_avg ?? a.avg_standing ?? 999;
      const bStanding = b.conf_standing_no_ties_avg ?? b.avg_standing ?? 999;
      return aStanding - bStanding;
    });
  }, [standings]);

  // Debug logging
  console.log("=== DEBUG: Football No-Ties Data ===");
  console.log("Total teams:", standings.length);
  if (standings.length > 0) {
    const firstTeam = standings[0];
    console.log("First team:", firstTeam.team_name);
    console.log("standing_dist_no_ties:", firstTeam.standing_dist_no_ties);
    console.log(
      "conf_standing_no_ties_avg:",
      firstTeam.conf_standing_no_ties_avg
    );
    console.log("All keys:", Object.keys(firstTeam));

    // Check a few more teams
    standings.slice(0, 3).forEach((team, index) => {
      console.log(`Team ${index + 1} (${team.team_name}):`);
      console.log("  standing_dist_no_ties:", team.standing_dist_no_ties);
      console.log(
        "  has data:",
        Object.keys(team.standing_dist_no_ties || {}).length > 0
      );
    });
  }

  const positions = useMemo(() => {
    let maxPosition = 0;

    for (const team of standings) {
      if (team.standing_dist_no_ties) {
        const validPositions = Object.keys(team.standing_dist_no_ties)
          .map((key) => parseFloat(key))
          .filter((pos) => !isNaN(pos) && isFinite(pos) && pos > 0);

        if (validPositions.length > 0) {
          const teamMax = Math.max(...validPositions);
          if (teamMax > maxPosition) maxPosition = teamMax;
        }
      }
    }

    console.log("Max position found:", maxPosition);
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
  const summaryRowHeight = isMobile ? 24 : 28;

  return (
    <div
      className={cn(
        tableStyles.tableContainer,
        "standings-no-ties-table",
        className,
        "relative overflow-x-auto"
      )}
    >
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
                border: "1px solid #e5e7eb",
                borderBottom: "2px solid #d1d5db",
              }}
            >
              Pos
            </th>
            {sortedTeams.map((team) => (
              <th
                key={`${team.team_id}-${team.team_name}`}
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
                  team.standing_dist_no_ties?.[position.toString()] ||
                  team.standing_dist_no_ties?.[`${position}.0`] ||
                  0;

                // Debug specific cells
                if (position <= 3 && sortedTeams.indexOf(team) <= 2) {
                  console.log(`Debug cell [${position}][${team.team_name}]:`, {
                    percentage,
                    raw_data: team.standing_dist_no_ties,
                    position_key: position.toString(),
                  });
                }

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
                borderTop: "2px solid #d1d5db",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              Avg
            </td>
            {sortedTeams.map((team) => {
              const avgStanding =
                team.conf_standing_no_ties_avg ?? team.avg_standing ?? 0;
              return (
                <td
                  key={`${team.team_id}-${team.team_name}-avg`}
                  className={`text-center font-medium ${isMobile ? "text-xs" : "text-sm"}`}
                  style={{
                    height: summaryRowHeight,
                    width: teamColWidth,
                    minWidth: teamColWidth,
                    maxWidth: teamColWidth,
                    border: "1px solid #e5e7eb",
                    borderTop: "2px solid #d1d5db",
                    borderLeft: "none",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  {avgStanding.toFixed(1)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default memo(FootballStandingsTableNoTies);
