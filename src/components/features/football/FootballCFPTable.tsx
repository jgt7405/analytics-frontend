// src/components/features/football/FootballCFPTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import { FootballCFPTeam } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, ReactNode, useEffect, useMemo, useState } from "react";
import styles from "./FootballCFPTable.module.css";

interface FootballCFPTableProps {
  cfpData: FootballCFPTeam[];
  className?: string;
  showAllTeams?: boolean;
  season?: string;
  /** Optional element (e.g. conference selector) rendered on the right of the title row. */
  headerRight?: ReactNode;
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
  season,
  headerRight,
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
    const path = season
      ? `/football/${season}/team/${encodeURIComponent(teamName)}`
      : `/football/team/${encodeURIComponent(teamName)}`;
    router.push(path);
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

  // Format percentage without decimal if it's a whole number
  const formatPercentage = (value: number): string => {
    if (value === 0) return "";
    const rounded = Math.round(value);
    return `${rounded}%`;
  };

  if (!cfpData || cfpData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">No CFP data available</div>
    );
  }

  const headerCellClass = (round: RoundKey) =>
    cn(styles.headerCell, sortColumn === round && styles.headerCellActive);

  return (
    <div className={cn(styles.card, "cfp-table", className)}>
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 className={styles.title}>College Football Playoff Projections</h2>
        </div>
        {headerRight && <div data-screenshot-hide="true">{headerRight}</div>}
      </div>

      {/* Row filter - only show when All Teams is selected */}
      {showAllTeams && (
        <div className={styles.filterRow}>
          <label
            className={`text-gray-700 dark:text-gray-300 font-medium ${isMobile ? "text-xs" : "text-sm"}`}
          >
            Show top:
          </label>
          <input
            type="number"
            min="1"
            max={cfpData.length}
            value={inputValue}
            onChange={handleRowsInputChange}
            className={cn(styles.filterInput, isMobile ? "text-xs" : "text-sm")}
            placeholder={cfpData.length.toString()}
          />
          <span className={`text-gray-600 dark:text-gray-300 ${isMobile ? "text-xs" : "text-sm"}`}>
            teams (of {cfpData.length})
          </span>
        </div>
      )}

      <div className={styles.scrollViewport}>
        <table className={styles.table}>
          <thead>
            <tr>
              {/* Rank column */}
              <th
                className={cn(styles.headerCell, styles.stickyCell, isMobile ? "text-xs" : "text-sm")}
                style={{
                  width: rankColWidth,
                  minWidth: rankColWidth,
                  maxWidth: rankColWidth,
                  height: headerHeight,
                  left: 0,
                }}
              >
                #
              </th>
              {/* Team column */}
              <th
                className={cn(
                  styles.headerCell,
                  styles.stickyCell,
                  isMobile ? "text-xs" : "text-sm",
                )}
                style={{
                  width: firstColWidth,
                  minWidth: firstColWidth,
                  maxWidth: firstColWidth,
                  height: headerHeight,
                  textAlign: "left",
                  paddingLeft: "0.5rem",
                  left: rankColWidth,
                }}
              >
                Team
              </th>
              {/* Round columns */}
              {allRounds.map((round) => (
                <th
                  key={round}
                  className={cn(headerCellClass(round as RoundKey), isMobile ? "text-xs" : "text-sm")}
                  onClick={() => handleColumnClick(round as RoundKey)}
                  style={{
                    height: headerHeight,
                    width: roundColWidth,
                    minWidth: roundColWidth,
                    maxWidth: roundColWidth,
                    fontSize: isMobile ? "10px" : "12px",
                  }}
                  title="Click to sort by this column"
                >
                  {fieldToLabel[round]}
                  {sortColumn === round && (
                    <div className={styles.sortArrow}>▼</div>
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
                  className={cn(
                    styles.rankCell,
                    styles.stickyBodyCell,
                    isMobile ? "text-xs" : "text-sm",
                  )}
                  style={{
                    width: rankColWidth,
                    minWidth: rankColWidth,
                    maxWidth: rankColWidth,
                    height: cellHeight,
                    left: 0,
                  }}
                >
                  {index + 1}
                </td>
                {/* Team cell */}
                <td
                  className={cn(
                    styles.teamCell,
                    styles.stickyBodyCell,
                    isMobile ? "text-xs" : "text-sm",
                  )}
                  style={{
                    width: firstColWidth,
                    minWidth: firstColWidth,
                    maxWidth: firstColWidth,
                    height: cellHeight,
                    paddingLeft: "0.5rem",
                    left: rankColWidth,
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
                  return (
                    <td
                      key={round}
                      style={{
                        width: roundColWidth,
                        minWidth: roundColWidth,
                        maxWidth: roundColWidth,
                        height: cellHeight,
                        padding: 0,
                      }}
                    >
                      <div
                        className={styles.heatTile}
                        style={{
                          ...getCellColor(value, "blue"),
                          fontFamily: "var(--font-roboto-condensed)",
                          fontSize: isMobile ? "10px" : "12px",
                        }}
                      >
                        {formatPercentage(value)}
                      </div>
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
