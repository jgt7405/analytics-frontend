"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useRouter } from "next/navigation";
import { memo, useMemo } from "react";

interface FootballConfChampTeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  Champ_Game?: number;
  Champion?: number;
}

interface FootballConfChampTableProps {
  confChampData: FootballConfChampTeam[];
  className?: string;
}

function FootballConfChampTable({
  confChampData,
  className,
}: FootballConfChampTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = (teamName: string) => {
    router.push(`/football/team/${encodeURIComponent(teamName)}`);
  };

  // Only show columns that have data (mirroring basketball logic)
  const fieldToLabel: Record<string, string> = {
    Champ_Game: "Champ\nGame",
    Champion: "Champion",
  };

  const activeColumns = useMemo(() => {
    const columns = ["Champ_Game", "Champion"] as const;
    return columns.filter((column) =>
      confChampData.some((team) => team[column] && team[column]! > 0)
    );
  }, [confChampData]);

  const sortedTeams = useMemo(() => {
    return [...confChampData].sort((a, b) => {
      // Sort by Champion first, then Champ_Game
      const aChamp = a.Champion || 0;
      const bChamp = b.Champion || 0;
      if (aChamp !== bChamp) return bChamp - aChamp;

      const aGame = a.Champ_Game || 0;
      const bGame = b.Champ_Game || 0;
      return bGame - aGame;
    });
  }, [confChampData]);

  // Use same dimensions as basketball conf-tourney
  const firstColWidth = isMobile ? 120 : 180;
  const roundColWidth = isMobile ? 55 : 70;
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 50 : 60;

  const tableClassName = cn(
    tableStyles.tableContainer,
    "conf-champ-table",
    className
  );

  if (!confChampData || confChampData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No conference championship data available
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
            {activeColumns.map((column) => (
              <th
                key={column}
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
                {fieldToLabel[column]}
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
              {activeColumns.map((column) => {
                const value = team[column] || 0;
                const colorStyle = getCellColor(value);

                return (
                  <td
                    key={`${team.team_name}-${column}`}
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

export default memo(FootballConfChampTable);
