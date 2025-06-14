"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useRouter } from "next/navigation";
import { memo, useMemo } from "react";

interface TourneyTeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  Champion?: number;
  Finals?: number;
  Semifinals?: number;
  Quarterfinals?: number;
  First_Round?: number;
  Second_Round?: number;
  Third_Round?: number;
  Fourth_Round?: number;
}

interface ConferenceTourneyTableProps {
  tourneyData: TourneyTeam[];
  className?: string;
}

function ConferenceTourneyTable({
  tourneyData,
  className,
}: ConferenceTourneyTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = (teamName: string) => {
    router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
  };

  const roundOrder = [
    "First_Round",
    "Second_Round",
    "Third_Round",
    "Fourth_Round",
    "Quarterfinals",
    "Semifinals",
    "Finals",
    "Champion",
  ];

  const fieldToLabel: Record<string, string> = {
    First_Round: "First\nRound",
    Second_Round: "Second\nRound",
    Third_Round: "Third\nRound",
    Fourth_Round: "Fourth\nRound",
    Quarterfinals: "Quarter-\nfinals",
    Semifinals: "Semi-\nfinals",
    Finals: "Finals",
    Champion: "Champion",
  };

  const activeRounds = useMemo(() => {
    return roundOrder.filter((round) =>
      tourneyData.some(
        (team) => (team as any)[round] && (team as any)[round] > 0
      )
    );
  }, [tourneyData]);

  const sortedTeams = useMemo(() => {
    return [...tourneyData].sort((a, b) => {
      const reverseRounds = [...roundOrder].reverse();
      for (const round of reverseRounds) {
        if (activeRounds.includes(round)) {
          const aVal = (a as any)[round] || 0;
          const bVal = (b as any)[round] || 0;
          if (aVal !== bVal) return bVal - aVal;
        }
      }
      return 0;
    });
  }, [tourneyData, activeRounds]);

  const firstColWidth = isMobile ? 120 : 180;
  const roundColWidth = isMobile ? 55 : 70; // Increased width for wrapped labels
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 50 : 60; // Increased height for wrapped labels

  const tableClassName = cn(
    tableStyles.tableContainer,
    "conf-tourney-table",
    className
  );

  if (!tourneyData || tourneyData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No tournament data available
      </div>
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
              className={`sticky left-0 z-30 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
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
            {activeRounds.map((round) => (
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
                className={`sticky left-0 z-20 bg-white text-left px-2 ${isMobile ? "text-xs" : "text-sm"}`}
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
                <div className="flex items-center gap-2">
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
                    size={isMobile ? 20 : 24}
                    onClick={() => navigateToTeam(team.team_name)}
                  />
                  <span className="truncate">{team.team_name}</span>
                </div>
              </td>
              {activeRounds.map((round) => {
                const value = (team as any)[round] || 0;
                const colorStyle = getCellColor(value);

                return (
                  <td
                    key={`${team.team_name}-${round}`}
                    className="relative p-0"
                    style={{
                      height: cellHeight,
                      width: roundColWidth,
                      minWidth: roundColWidth,
                      maxWidth: roundColWidth,
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
                      {value > 0 ? `${Math.round(value)}%` : ""}
                    </div>
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

export default memo(ConferenceTourneyTable);
