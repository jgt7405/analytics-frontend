// src/components/features/football/FootballConfChampProb.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useRouter } from "next/navigation";
import { memo, useMemo, useState } from "react";

interface ConfChampTeam {
  team_name: string;
  team_id: string | number;
  logo_url: string;
  currentProb: number;
  whatIfProb: number;
  change: number;
}

interface FootballConfChampProbProps {
  currentData: ConfChampTeam[];
  whatIfData?: ConfChampTeam[];
  className?: string;
  hasWhatIf: boolean;
  hasCalculated: boolean;
  isScreenshotMode?: boolean;
}

type SortColumn = "team" | "current" | "whatif" | "change" | null;
type SortDirection = "asc" | "desc";

function FootballConfChampProb({
  currentData,
  whatIfData,
  className,
  hasCalculated,
  isScreenshotMode = false,
}: FootballConfChampProbProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const navigateToTeam = (teamName: string) => {
    router.push(`/football/team/${encodeURIComponent(teamName)}`);
  };

  // Combine current and what-if data
  const combinedData = useMemo(() => {
    return currentData.map((current) => {
      const whatIf = whatIfData?.find((w) => w.team_id === current.team_id);
      return {
        team_id: current.team_id,
        team_name: current.team_name,
        logo_url: current.logo_url,
        currentProb: current.currentProb,
        whatIfProb: whatIf ? whatIf.whatIfProb : 0,
        change: whatIf ? whatIf.whatIfProb - current.currentProb : 0,
        isZero:
          current.currentProb === 0 && (!whatIf || whatIf.whatIfProb === 0),
      };
    });
  }, [currentData, whatIfData]);

  const sortedTeams = useMemo(() => {
    // Separate zero teams from non-zero teams
    const zeroTeams = combinedData.filter((t) => t.isZero);
    const nonZeroTeams = combinedData.filter((t) => !t.isZero);

    if (sortColumn) {
      nonZeroTeams.sort((a, b) => {
        let compareValue = 0;

        switch (sortColumn) {
          case "team":
            compareValue = a.team_name.localeCompare(b.team_name);
            break;
          case "current":
            compareValue = a.currentProb - b.currentProb;
            break;
          case "whatif":
            compareValue = a.whatIfProb - b.whatIfProb;
            break;
          case "change":
            compareValue = a.change - b.change;
            break;
        }

        // Apply sort direction
        return sortDirection === "asc" ? compareValue : -compareValue;
      });

      // Sort zero teams alphabetically
      zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));

      return [...nonZeroTeams, ...zeroTeams];
    }

    // Default sort after calculation: current descending, then whatIf descending
    if (hasCalculated) {
      nonZeroTeams.sort((a, b) => {
        if (b.currentProb !== a.currentProb) {
          return b.currentProb - a.currentProb;
        }
        if (b.whatIfProb !== a.whatIfProb) {
          return b.whatIfProb - a.whatIfProb;
        }
        return a.team_name.localeCompare(b.team_name);
      });

      // Sort zero teams alphabetically
      zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));

      return [...nonZeroTeams, ...zeroTeams];
    }

    // Default sort before calculation: current probability descending, then alphabetical
    nonZeroTeams.sort((a, b) => {
      if (b.currentProb !== a.currentProb) {
        return b.currentProb - a.currentProb;
      }
      return a.team_name.localeCompare(b.team_name);
    });

    // Sort zero teams alphabetically
    zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));

    return [...nonZeroTeams, ...zeroTeams];
  }, [combinedData, sortColumn, sortDirection, hasCalculated]);

  const handleColumnClick = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column is clicked
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Default to descending for new column
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Responsive dimensions
  const rankColWidth = isMobile ? 30 : 45;
  const teamColWidth = isMobile ? 40 : 180;
  const probColWidth = isMobile ? 60 : 100;
  const cellHeight = isMobile ? 32 : 36;
  const headerHeight = isMobile ? 48 : 56;

  const tableClassName = cn(
    tableStyles.tableContainer,
    "conf-champ-prob-table",
    className
  );

  // Calculate min/max for change color scaling
  const { minChange, maxChange } = useMemo(() => {
    const changes = sortedTeams.map((team) => team.change);
    return {
      minChange: Math.min(...changes, -1),
      maxChange: Math.max(...changes, 1),
    };
  }, [sortedTeams]);

  // Get TWV-style color for change cells (matches TWV table exactly)
  const getChangeCellColor = (change: number) => {
    if (change === 0) return { backgroundColor: "white", color: "black" };

    const blue = [24, 98, 123]; // Dark blue for positive values
    const white = [255, 255, 255]; // White baseline
    const yellow = [255, 230, 113]; // Yellow for negative values

    let r: number, g: number, b: number;

    if (change > 0) {
      // Positive values: interpolate from white to dark blue
      const ratio = Math.min(Math.abs(change / maxChange), 1);
      r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
      g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
      b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
    } else if (change < 0) {
      // Negative values: interpolate from white to yellow
      const ratio = Math.min(Math.abs(change / minChange), 1);
      r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
      g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
      b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);
    } else {
      // Zero values remain white
      [r, g, b] = white;
    }

    // Calculate brightness for text color contrast
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 140 ? "#000000" : "#ffffff";

    return {
      backgroundColor: `rgb(${r}, ${g}, ${b})`,
      color: textColor,
    };
  };

  if (!currentData || currentData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No data available</div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`${tableClassName} relative overflow-x-auto overflow-y-auto max-h-[70vh]`}
      >
        <table
          className="border-collapse border-spacing-0"
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              {/* Rank Column */}
              <th
                className={`${isScreenshotMode ? "" : "sticky left-0 z-30"} bg-gray-50 text-center font-normal ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: rankColWidth,
                  minWidth: rankColWidth,
                  maxWidth: rankColWidth,
                  height: headerHeight,
                  ...(isScreenshotMode
                    ? {}
                    : {
                        position: "sticky" as const,
                        top: 0,
                        left: 0,
                      }),
                  border: "1px solid #e5e7eb",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                #
              </th>

              {/* Team Column */}
              <th
                className={`${isScreenshotMode ? "" : "sticky z-30"} bg-gray-50 text-left font-normal px-2 cursor-pointer hover:bg-gray-100 transition-colors ${
                  sortColumn === "team" ? "bg-blue-100" : ""
                } ${isMobile ? "text-xs" : "text-sm"}`}
                onClick={() => handleColumnClick("team")}
                style={{
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  height: headerHeight,
                  ...(isScreenshotMode
                    ? {}
                    : {
                        position: "sticky" as const,
                        top: 0,
                        left: rankColWidth,
                      }),
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderRight: "1px solid #e5e7eb",
                }}
                title="Click to sort by team name"
              >
                Team
                {sortColumn === "team" && (
                  <div className="text-blue-600 text-xs mt-1">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </div>
                )}
              </th>

              {/* Current Probability Column */}
              <th
                className={`bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  sortColumn === "current" ? "bg-blue-100" : ""
                } ${isMobile ? "text-xs" : "text-sm"}`}
                onClick={() => handleColumnClick("current")}
                style={{
                  width: probColWidth,
                  minWidth: probColWidth,
                  maxWidth: probColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  whiteSpace: "pre-line",
                  lineHeight: "1.2",
                }}
                title="Click to sort by current probability"
              >
                {isMobile ? "Current\n%" : "Current %"}
                {sortColumn === "current" && (
                  <div className="text-blue-600 text-xs mt-1">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </div>
                )}
              </th>

              {/* What-If Probability Column */}
              <th
                className={`bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  sortColumn === "whatif" ? "bg-blue-100" : ""
                } ${isMobile ? "text-xs" : "text-sm"}`}
                onClick={() => handleColumnClick("whatif")}
                style={{
                  width: probColWidth,
                  minWidth: probColWidth,
                  maxWidth: probColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  whiteSpace: "pre-line",
                  lineHeight: "1.2",
                }}
                title="Click to sort by what-if probability"
              >
                {isMobile ? "What-If\n%" : "What-If %"}
                {sortColumn === "whatif" && (
                  <div className="text-blue-600 text-xs mt-1">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </div>
                )}
              </th>

              {/* Change Column */}
              <th
                className={`bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  sortColumn === "change" ? "bg-blue-100" : ""
                } ${isMobile ? "text-xs" : "text-sm"}`}
                onClick={() => handleColumnClick("change")}
                style={{
                  width: probColWidth,
                  minWidth: probColWidth,
                  maxWidth: probColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                }}
                title="Click to sort by change"
              >
                Change
                {sortColumn === "change" && (
                  <div className="text-blue-600 text-xs mt-1">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, index) => (
              <tr
                key={`${team.team_name}-${index}`}
                className={team.isZero ? "opacity-40" : ""}
              >
                {/* Rank Cell */}
                <td
                  className={`${isScreenshotMode ? "" : "sticky left-0 z-20"} bg-white text-center ${
                    isMobile ? "text-xs" : "text-sm"
                  } font-medium`}
                  style={{
                    width: rankColWidth,
                    minWidth: rankColWidth,
                    maxWidth: rankColWidth,
                    height: cellHeight,
                    ...(isScreenshotMode
                      ? {}
                      : {
                          position: "sticky" as const,
                          left: 0,
                          zIndex: 20,
                        }),
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderRight: "1px solid #e5e7eb",
                  }}
                >
                  {index + 1}
                </td>

                {/* Team Cell */}
                <td
                  className={`${isScreenshotMode ? "" : "sticky z-20"} bg-white text-left px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                  style={{
                    width: teamColWidth,
                    minWidth: teamColWidth,
                    maxWidth: teamColWidth,
                    height: cellHeight,
                    ...(isScreenshotMode
                      ? {}
                      : {
                          position: "sticky" as const,
                          left: rankColWidth,
                          zIndex: 20,
                        }),
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    className={`flex items-center gap-2 ${isMobile ? "justify-center" : "justify-start"}`}
                  >
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.team_name}
                      size={isMobile ? 20 : 24}
                      onClick={() => navigateToTeam(team.team_name)}
                    />
                    {!isMobile && (
                      <span className="truncate">{team.team_name}</span>
                    )}
                  </div>
                </td>

                {/* Current Probability Cell */}
                <td
                  className="relative p-0"
                  style={{
                    height: cellHeight,
                    width: probColWidth,
                    minWidth: probColWidth,
                    maxWidth: probColWidth,
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderLeft: "none",
                    ...getCellColor(team.currentProb),
                  }}
                >
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"} font-medium`}
                  >
                    {team.currentProb > 0
                      ? `${team.currentProb.toFixed(1)}%`
                      : ""}
                  </div>
                </td>

                {/* What-If Probability Cell */}
                <td
                  className="relative p-0"
                  style={{
                    height: cellHeight,
                    width: probColWidth,
                    minWidth: probColWidth,
                    maxWidth: probColWidth,
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderLeft: "none",
                    ...(hasCalculated
                      ? getCellColor(team.whatIfProb)
                      : { backgroundColor: "white", color: "transparent" }),
                  }}
                >
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"} font-medium`}
                  >
                    {hasCalculated && team.whatIfProb > 0
                      ? `${team.whatIfProb.toFixed(1)}%`
                      : ""}
                  </div>
                </td>

                {/* Change Cell */}
                <td
                  className="relative p-0"
                  style={{
                    height: cellHeight,
                    width: probColWidth,
                    minWidth: probColWidth,
                    maxWidth: probColWidth,
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderLeft: "none",
                    ...(hasCalculated
                      ? getChangeCellColor(team.change)
                      : { backgroundColor: "white", color: "transparent" }),
                  }}
                >
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"} font-medium`}
                  >
                    {hasCalculated && team.change !== 0 && (
                      <>
                        {team.change > 0 ? "+" : ""}
                        {team.change.toFixed(1)}%
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(FootballConfChampProb);
