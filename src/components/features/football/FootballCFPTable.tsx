// src/components/features/football/FootballCFPTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { FootballCFPTeam } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, useMemo } from "react";

interface FootballCFPTableProps {
  cfpData: FootballCFPTeam[];
  className?: string;
}

function FootballCFPTable({ cfpData, className }: FootballCFPTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = (teamName: string) => {
    router.push(`/football/team/${encodeURIComponent(teamName)}`);
  };

  const roundOrder = useMemo(
    () =>
      [
        "CFP_First_Round",
        "CFP_Quarterfinals",
        "CFP_Semifinals",
        "CFP_Championship",
        "CFP_Champion",
      ] as const,
    []
  );

  const fieldToLabel: Record<string, string> = {
    CFP_First_Round: "First\nRound",
    CFP_Quarterfinals: "Quarter-\nfinals",
    CFP_Semifinals: "Semi-\nfinals",
    CFP_Championship: "Champion-\nship",
    CFP_Champion: "Champion",
  };

  // Show ALL rounds, not just active ones
  const allRounds = roundOrder;

  const sortedTeams = useMemo(() => {
    return [...cfpData].sort((a, b) => {
      const reverseRounds = [...roundOrder].reverse();
      for (const round of reverseRounds) {
        const aVal = (a[round as keyof FootballCFPTeam] as number) || 0;
        const bVal = (b[round as keyof FootballCFPTeam] as number) || 0;
        if (aVal !== bVal) return bVal - aVal;
      }

      // Final tiebreaker: alphabetical order by team name
      return a.team_name.localeCompare(b.team_name);
    });
  }, [cfpData, roundOrder]);

  const firstColWidth = isMobile ? 120 : 180;
  const roundColWidth = isMobile ? 55 : 70;
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 50 : 60;

  const tableClassName = cn(tableStyles.tableContainer, "cfp-table", className);

  // Format percentage without decimal if it's a whole number
  const formatPercentage = (value: number): string => {
    if (value === 0) return "";
    const rounded = Math.round(value);
    return `${rounded}%`;
  };

  if (!cfpData || cfpData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No CFP data available</div>
    );
  }

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
              className={`sticky left-0 z-30 bg-gray-50 text-left font-normal px-2 ${
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
                borderRight: "1px solid #e5e7eb",
                verticalAlign: "middle",
              }}
            >
              Team
            </th>
            {allRounds.map((round) => (
              <th
                key={round}
                className="bg-gray-50 text-center font-normal"
                style={{
                  height: headerHeight,
                  width: roundColWidth,
                  minWidth: roundColWidth,
                  maxWidth: roundColWidth,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  fontSize: isMobile ? "10px" : "12px",
                  whiteSpace: "pre-line",
                  verticalAlign: "middle",
                  lineHeight: "1.2",
                }}
              >
                {fieldToLabel[round]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTeams.map((team, index) => (
            <tr key={`${team.team_name}-${index}`}>
              <td
                className={`sticky left-0 z-20 bg-white text-left px-2 ${
                  isMobile ? "text-xs" : "text-sm"
                } cursor-pointer hover:bg-gray-50 transition-colors`}
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
                  verticalAlign: "middle",
                }}
                onClick={() => navigateToTeam(team.team_name)}
              >
                <div className="flex items-center gap-2">
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
                    size={isMobile ? 16 : 20}
                  />
                  <span className="truncate">{team.team_name}</span>
                </div>
              </td>
              {allRounds.map((round) => {
                const value =
                  (team[round as keyof FootballCFPTeam] as number) || 0;
                const cellStyle = getCellColor(value, "blue");
                return (
                  <td
                    key={round}
                    className="text-center"
                    style={{
                      fontFamily: "var(--font-roboto-condensed)",
                      width: roundColWidth,
                      minWidth: roundColWidth,
                      maxWidth: roundColWidth,
                      height: cellHeight,
                      backgroundColor: cellStyle.backgroundColor,
                      color: cellStyle.color,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      fontSize: isMobile ? "10px" : "12px",
                      verticalAlign: "middle",
                    }}
                  >
                    {formatPercentage(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(FootballCFPTable);
