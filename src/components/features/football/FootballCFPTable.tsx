// src/components/features/football/FootballCFPTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { FootballCFPTeam } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";

interface FootballCFPTableProps {
  cfpData: FootballCFPTeam[];
  className?: string;
  showAllTeams?: boolean;
}

type RoundKey =
  | "CFP_First_Round"
  | "CFP_Quarterfinals"
  | "CFP_Semifinals"
  | "CFP_Championship"
  | "CFP_Champion";

function FootballCFPTable({
  cfpData,
  className,
  showAllTeams = false,
}: FootballCFPTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [sortColumn, setSortColumn] = useState<RoundKey | null>(null);
  const [rowsToShow, setRowsToShow] = useState<number>(cfpData.length);
  const [inputValue, setInputValue] = useState<string>(
    cfpData.length.toString()
  );

  // Reset to show all rows when switching to "All Teams"
  useEffect(() => {
    if (showAllTeams) {
      setRowsToShow(cfpData.length);
      setInputValue(cfpData.length.toString());
    }
  }, [showAllTeams, cfpData.length]);

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

  const allRounds = roundOrder;

  const sortedTeams = useMemo(() => {
    const teams = [...cfpData];

    if (sortColumn) {
      // When a specific column is selected, sort by that column first
      return teams.sort((a, b) => {
        // Primary sort by selected column (descending)
        const aVal = (a[sortColumn] as number) || 0;
        const bVal = (b[sortColumn] as number) || 0;
        if (aVal !== bVal) return bVal - aVal;

        // Secondary sort by remaining columns in reverse order (Champion -> First Round)
        const reverseRounds = [...roundOrder]
          .reverse()
          .filter((r) => r !== sortColumn);
        for (const round of reverseRounds) {
          const aSecondary = (a[round as keyof FootballCFPTeam] as number) || 0;
          const bSecondary = (b[round as keyof FootballCFPTeam] as number) || 0;
          if (aSecondary !== bSecondary) return bSecondary - aSecondary;
        }

        // Final tiebreaker: alphabetical order by team name
        return a.team_name.localeCompare(b.team_name);
      });
    }

    // Default sort (Champion -> Championship -> Semifinals -> Quarterfinals -> First Round)
    return teams.sort((a, b) => {
      const reverseRounds = [...roundOrder].reverse();
      for (const round of reverseRounds) {
        const aVal = (a[round as keyof FootballCFPTeam] as number) || 0;
        const bVal = (b[round as keyof FootballCFPTeam] as number) || 0;
        if (aVal !== bVal) return bVal - aVal;
      }

      // Final tiebreaker: alphabetical order by team name
      return a.team_name.localeCompare(b.team_name);
    });
  }, [cfpData, roundOrder, sortColumn]);

  // Apply row limit filter
  const displayedTeams = useMemo(() => {
    if (showAllTeams) {
      return sortedTeams.slice(0, rowsToShow);
    }
    return sortedTeams;
  }, [sortedTeams, rowsToShow, showAllTeams]);

  const handleColumnClick = (round: RoundKey) => {
    setSortColumn(sortColumn === round ? null : round);
  };

  const handleRowsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0 && numValue <= cfpData.length) {
      setRowsToShow(numValue);
    }
  };

  const rankColWidth = isMobile ? 35 : 45;
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
    <div className="space-y-3">
      {/* Row filter - only show when All Teams is selected */}
      {showAllTeams && (
        <div className="flex items-center gap-3 px-2">
          <label
            className={`text-gray-700 font-medium ${isMobile ? "text-xs" : "text-sm"}`}
          >
            Show top:
          </label>
          <input
            type="number"
            min="1"
            max={cfpData.length}
            value={inputValue}
            onChange={handleRowsInputChange}
            className={`border border-gray-300 rounded px-3 py-1 w-24 ${
              isMobile ? "text-xs" : "text-sm"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder={cfpData.length.toString()}
          />
          <span className={`text-gray-600 ${isMobile ? "text-xs" : "text-sm"}`}>
            teams (of {cfpData.length})
          </span>
        </div>
      )}

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
              {/* Rank column */}
              <th
                className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${
                  isMobile ? "text-xs" : "text-sm"
                }`}
                style={{
                  width: rankColWidth,
                  minWidth: rankColWidth,
                  maxWidth: rankColWidth,
                  height: headerHeight,
                  position: "sticky",
                  left: 0,
                  border: "1px solid #e5e7eb",
                  borderRight: "1px solid #e5e7eb",
                  verticalAlign: "middle",
                }}
              >
                #
              </th>
              {/* Team column */}
              <th
                className={`sticky z-30 bg-gray-50 text-left font-normal px-2 ${
                  isMobile ? "text-xs" : "text-sm"
                }`}
                style={{
                  width: firstColWidth,
                  minWidth: firstColWidth,
                  maxWidth: firstColWidth,
                  height: headerHeight,
                  position: "sticky",
                  left: rankColWidth,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderRight: "1px solid #e5e7eb",
                  verticalAlign: "middle",
                }}
              >
                Team
              </th>
              {/* Round columns */}
              {allRounds.map((round) => (
                <th
                  key={round}
                  className={`bg-gray-50 text-center font-normal cursor-pointer hover:bg-gray-100 transition-colors ${
                    sortColumn === round ? "bg-blue-100" : ""
                  }`}
                  onClick={() => handleColumnClick(round as RoundKey)}
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
                  title="Click to sort by this column"
                >
                  {fieldToLabel[round]}
                  {sortColumn === round && (
                    <div className="text-blue-600 text-xs mt-1">▼</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedTeams.map((team, index) => (
              <tr key={`${team.team_name}-${index}`}>
                {/* Rank cell */}
                <td
                  className={`sticky left-0 z-20 bg-white text-center ${
                    isMobile ? "text-xs" : "text-sm"
                  } font-medium`}
                  style={{
                    width: rankColWidth,
                    minWidth: rankColWidth,
                    maxWidth: rankColWidth,
                    height: cellHeight,
                    position: "sticky",
                    left: 0,
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderRight: "1px solid #e5e7eb",
                    verticalAlign: "middle",
                  }}
                >
                  {index + 1}
                </td>
                {/* Team cell */}
                <td
                  className={`sticky z-20 bg-white text-left px-2 ${
                    isMobile ? "text-xs" : "text-sm"
                  } cursor-pointer hover:bg-gray-50 transition-colors`}
                  style={{
                    width: firstColWidth,
                    minWidth: firstColWidth,
                    maxWidth: firstColWidth,
                    height: cellHeight,
                    position: "sticky",
                    left: rankColWidth,
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderLeft: "none",
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
                {/* Round cells */}
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
    </div>
  );
}

export default memo(FootballCFPTable);
