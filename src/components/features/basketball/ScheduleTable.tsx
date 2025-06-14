"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { ScheduleData } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { memo, useCallback } from "react";

interface ScheduleTableProps {
  scheduleData: ScheduleData[];
  teams: string[];
  teamLogos: Record<string, string>;
  summary: Record<string, any>;
  className?: string;
  // ✅ New props to control what gets rendered
  renderMainTable?: boolean;
  renderSummaryTable?: boolean;
}

function ScheduleTable({
  scheduleData,
  teams,
  teamLogos,
  summary,
  className,
  renderMainTable = true, // ✅ Default to true
  renderSummaryTable = true, // ✅ Default to true
}: ScheduleTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
    },
    [router]
  );

  const getLocationStyle = useCallback((location: string) => {
    switch (location) {
      case "Home":
        return { backgroundColor: "#add8e6" };
      case "Away":
        return { backgroundColor: "#ffffe0" };
      case "Neutral":
        return { backgroundColor: "#e6e6fa" };
      default:
        return { backgroundColor: "#f0f0f0" };
    }
  }, []);

  const getCellStyle = useCallback((value: string | undefined) => {
    if (!value || typeof value !== "string") return {};
    // Match CWV table colors exactly
    if (value === "W") return { backgroundColor: "#18627b", color: "white" }; // CWV win color
    if (value === "L") return { backgroundColor: "#fff7d6", color: "black" }; // CWV loss color
    if (/^\d{1,2}\/\d{1,2}$/.test(value))
      return { backgroundColor: "#add8e6", color: "#4b5563" }; // Next game color
    return {};
  }, []);

  const formatCellValue = useCallback((value: any): string => {
    if (value === null || value === undefined || value === "-") return "";
    if (typeof value === "object") return "";
    return String(value).trim();
  }, []);

  const getCellValue = useCallback((row: ScheduleData, team: string): any => {
    if (!row.games) return undefined;

    if (typeof row.games === "string") {
      try {
        const parsed = JSON.parse(row.games);
        return parsed[team];
      } catch {
        return undefined;
      }
    }

    if (typeof row.games === "object") {
      return (row.games as Record<string, any>)[team];
    }

    return undefined;
  }, []);

  const getSummaryColor = useCallback(
    (value: number, type: string) => {
      if (type === "expected_wins") {
        // Green gradient for expected wins
        const maxExpectedWins = Math.max(
          ...Object.values(summary).map((team: any) => team.expected_wins || 0)
        );
        const minExpectedWins = Math.min(
          ...Object.values(summary).map((team: any) => team.expected_wins || 0)
        );
        const normalizedValue =
          (value - minExpectedWins) / (maxExpectedWins - minExpectedWins);
        const adjustedValue = Math.pow(normalizedValue, 0.5);

        const r = Math.round(235 - 235 * adjustedValue);
        const g = Math.round(255 - 155 * adjustedValue);
        const b = Math.round(235 - 235 * adjustedValue);

        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const textColor = brightness > 140 ? "black" : "white";

        return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: textColor };
      } else if (type === "quartile") {
        // Blue gradient for quartile counts
        const maxQuartile = Math.max(
          ...Object.values(summary).flatMap((team: any) =>
            [
              team.top_quartile,
              team.second_quartile,
              team.third_quartile,
              team.bottom_quartile,
            ].filter(Boolean)
          )
        );

        const intensity = value / maxQuartile;
        const r = Math.round(195 - (195 - 24) * intensity);
        const g = Math.round(224 - (224 - 98) * intensity);
        const b = Math.round(236 - (236 - 123) * intensity);
        const textColor = intensity > 0.5 ? "white" : "black";
        return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: textColor };
      }
      return { backgroundColor: "#ffffff" };
    },
    [summary]
  );

  // ✅ Updated responsive dimensions with requested changes
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 40 : 48;
  const summaryRowHeight = isMobile ? 24 : 28;
  const firstColWidth = isMobile ? 60 : 80;
  const opponentColWidth = isMobile ? 45 : 80; // ✅ Made narrower on mobile: 60 -> 45
  const winProbColWidth = isMobile ? 80 : 100;
  const teamColWidth = isMobile ? 40 : 60; // ✅ Changed from 64 to 62 (2px smaller on desktop)
  const quartileColWidth = isMobile ? 50 : 70; // ✅ Wider quartile columns for second chart
  const summaryTeamColWidth = isMobile ? 55 : 75; // ✅ New: smaller team column for summary table

  const tableClassName = cn(
    tableStyles.tableContainer,
    "schedule-table",
    className
  );

  if (
    !scheduleData ||
    scheduleData.length === 0 ||
    !teams ||
    teams.length === 0
  ) {
    return (
      <div className="p-4 text-center text-gray-500">
        No schedule data available
      </div>
    );
  }

  return (
    <div>
      {/* ✅ Main Schedule Table - Only render if renderMainTable is true */}
      {renderMainTable && (
        <div className="mb-4">
          <div
            className={`${tableClassName} relative`}
            style={{
              overflowX: "auto",
              overflowY: "auto",
              maxHeight: "80vh",
            }}
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
                  {/* Location Column */}
                  <th
                    className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{
                      width: firstColWidth,
                      minWidth: firstColWidth,
                      maxWidth: firstColWidth,
                      height: headerHeight,
                      position: "sticky",
                      top: 0,
                      left: 0,
                      border: "1px solid #e5e7eb",
                      borderRight: "1px solid #e5e7eb",
                    }}
                  >
                    Location
                  </th>

                  {/* Opponent Column - ✅ Updated with responsive label */}
                  <th
                    className={`sticky z-30 bg-gray-50 text-center font-normal ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{
                      width: opponentColWidth,
                      minWidth: opponentColWidth,
                      maxWidth: opponentColWidth,
                      height: headerHeight,
                      position: "sticky",
                      top: 0,
                      left: firstColWidth,
                      border: "1px solid #e5e7eb",
                      borderLeft: "none",
                      borderRight: "1px solid #e5e7eb",
                    }}
                  >
                    {/* ✅ Responsive label with line break on mobile */}
                    {isMobile ? (
                      <>
                        Opp-
                        <br />
                        onent
                      </>
                    ) : (
                      "Opponent"
                    )}
                  </th>

                  {/* Win Probability Column */}
                  <th
                    className={`sticky z-30 bg-gray-50 text-center font-normal ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{
                      width: winProbColWidth,
                      minWidth: winProbColWidth,
                      maxWidth: winProbColWidth,
                      height: headerHeight,
                      position: "sticky",
                      top: 0,
                      left: firstColWidth + opponentColWidth,
                      border: "1px solid #e5e7eb",
                      borderLeft: "none",
                      borderRight: "2px solid #d1d5db",
                    }}
                  >
                    {isMobile ? (
                      <>
                        Avg Conf
                        <br />
                        Win Prob
                      </>
                    ) : (
                      <>
                        Avg Conf Team
                        <br />
                        Win Prob
                      </>
                    )}
                  </th>

                  {/* Team Columns */}
                  {teams.map((team) => (
                    <th
                      key={team}
                      className={`bg-gray-50 text-center font-normal sticky z-20`}
                      style={{
                        height: headerHeight,
                        width: teamColWidth,
                        minWidth: teamColWidth,
                        maxWidth: teamColWidth,
                        position: "sticky",
                        top: 0,
                        border: "1px solid #e5e7eb",
                        borderLeft: "none",
                      }}
                    >
                      <div className="flex justify-center items-center h-full">
                        <TeamLogo
                          logoUrl={
                            teamLogos[team] || "/images/team_logos/default.png"
                          }
                          teamName={team}
                          size={isMobile ? 24 : 28}
                          className="flex-shrink-0"
                          onClick={() => navigateToTeam(team)}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {scheduleData.map((row, index) => (
                  <tr key={index}>
                    {/* Location Cell */}
                    <td
                      className={`sticky left-0 z-20 text-center ${isMobile ? "text-xs" : "text-sm"}`}
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
                        ...getLocationStyle(row.Loc),
                      }}
                    >
                      {row.Loc}
                    </td>

                    {/* Opponent Cell */}
                    <td
                      className={`sticky z-20 bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                      style={{
                        width: opponentColWidth,
                        minWidth: opponentColWidth,
                        maxWidth: opponentColWidth,
                        height: cellHeight,
                        position: "sticky",
                        left: firstColWidth,
                        border: "1px solid #e5e7eb",
                        borderTop: "none",
                        borderLeft: "none",
                        borderRight: "1px solid #e5e7eb",
                      }}
                    >
                      <div className="flex justify-center items-center h-full">
                        {teamLogos[row.Team] ? (
                          <TeamLogo
                            logoUrl={teamLogos[row.Team]}
                            teamName={row.Team}
                            size={isMobile ? 20 : 24}
                            onClick={() => navigateToTeam(row.Team)}
                          />
                        ) : (
                          <span className="text-xs">{row.Team}</span>
                        )}
                      </div>
                    </td>

                    {/* Win Probability Cell */}
                    <td
                      className={`sticky z-20 bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                      style={{
                        width: winProbColWidth,
                        minWidth: winProbColWidth,
                        maxWidth: winProbColWidth,
                        height: cellHeight,
                        position: "sticky",
                        left: firstColWidth + opponentColWidth,
                        border: "1px solid #e5e7eb",
                        borderTop: "none",
                        borderLeft: "none",
                        borderRight: "2px solid #d1d5db",
                      }}
                    >
                      {row.Win_Pct || "-"}
                    </td>

                    {/* Team Game Cells */}
                    {teams.map((team) => {
                      const cellValue = getCellValue(row, team);
                      const displayValue = formatCellValue(cellValue);
                      const isEmpty = !displayValue || displayValue === "";

                      return (
                        <td
                          key={team}
                          className="relative p-0"
                          style={{
                            height: cellHeight,
                            width: teamColWidth,
                            minWidth: teamColWidth,
                            maxWidth: teamColWidth,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            // ✅ Made "no game" cells darker gray
                            backgroundColor: isEmpty
                              ? "#d1d5db"
                              : "transparent", // Changed from #f0f0f0 to #d1d5db
                          }}
                        >
                          <div
                            className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                            style={isEmpty ? {} : getCellStyle(displayValue)}
                          >
                            {displayValue}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* ✅ Enhanced Summary Rows with quartile data at bottom of main table */}
                {summary && Object.keys(summary).length > 0 && (
                  <>
                    {/* Total Games Row */}
                    <tr className="bg-gray-50">
                      <td
                        colSpan={3}
                        className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                        style={{
                          width:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          minWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          maxWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          height: summaryRowHeight,
                          position: "sticky",
                          left: 0,
                          border: "1px solid #e5e7eb",
                          borderTop: "2px solid #4b5563",
                          borderRight: "2px solid #d1d5db",
                        }}
                      >
                        Total Games
                      </td>
                      {teams.map((team) => (
                        <td
                          key={`${team}-total`}
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
                          {summary[team]?.total_games || 0}
                        </td>
                      ))}
                    </tr>

                    {/* Expected Wins Row */}
                    <tr className="bg-gray-50">
                      <td
                        colSpan={3}
                        className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                        style={{
                          width:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          minWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          maxWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          height: summaryRowHeight,
                          position: "sticky",
                          left: 0,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderRight: "2px solid #d1d5db",
                        }}
                      >
                        Expected Wins
                      </td>
                      {teams.map((team) => (
                        <td
                          key={`${team}-expected`}
                          className="bg-gray-50 text-center relative p-0"
                          style={{
                            height: summaryRowHeight,
                            width: teamColWidth,
                            minWidth: teamColWidth,
                            maxWidth: teamColWidth,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                          }}
                        >
                          <div
                            className={`absolute inset-0 flex items-center justify-center`}
                            style={{
                              ...getSummaryColor(
                                summary[team]?.expected_wins || 0,
                                "expected_wins"
                              ),
                              fontSize: isMobile ? "12px" : "14px",
                            }}
                          >
                            {summary[team]?.expected_wins || 0}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* ✅ NEW: Top Quartile Row */}
                    <tr className="bg-gray-50">
                      <td
                        colSpan={3}
                        className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                        style={{
                          width:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          minWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          maxWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          height: summaryRowHeight,
                          position: "sticky",
                          left: 0,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderRight: "2px solid #d1d5db",
                        }}
                      >
                        Top Quartile
                      </td>
                      {teams.map((team) => (
                        <td
                          key={`${team}-top-quartile`}
                          className="bg-gray-50 text-center relative p-0"
                          style={{
                            height: summaryRowHeight,
                            width: teamColWidth,
                            minWidth: teamColWidth,
                            maxWidth: teamColWidth,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                          }}
                        >
                          <div
                            className={`absolute inset-0 flex items-center justify-center`}
                            style={{
                              ...getSummaryColor(
                                summary[team]?.top_quartile || 0,
                                "quartile"
                              ),
                              fontSize: isMobile ? "12px" : "14px",
                            }}
                          >
                            {summary[team]?.top_quartile || 0}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* ✅ NEW: Second Quartile Row */}
                    <tr className="bg-gray-50">
                      <td
                        colSpan={3}
                        className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                        style={{
                          width:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          minWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          maxWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          height: summaryRowHeight,
                          position: "sticky",
                          left: 0,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderRight: "2px solid #d1d5db",
                        }}
                      >
                        Second Quartile
                      </td>
                      {teams.map((team) => (
                        <td
                          key={`${team}-second-quartile`}
                          className="bg-gray-50 text-center relative p-0"
                          style={{
                            height: summaryRowHeight,
                            width: teamColWidth,
                            minWidth: teamColWidth,
                            maxWidth: teamColWidth,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                          }}
                        >
                          <div
                            className={`absolute inset-0 flex items-center justify-center`}
                            style={{
                              ...getSummaryColor(
                                summary[team]?.second_quartile || 0,
                                "quartile"
                              ),
                              fontSize: isMobile ? "12px" : "14px",
                            }}
                          >
                            {summary[team]?.second_quartile || 0}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* ✅ NEW: Third Quartile Row */}
                    <tr className="bg-gray-50">
                      <td
                        colSpan={3}
                        className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                        style={{
                          width:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          minWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          maxWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          height: summaryRowHeight,
                          position: "sticky",
                          left: 0,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderRight: "2px solid #d1d5db",
                        }}
                      >
                        Third Quartile
                      </td>
                      {teams.map((team) => (
                        <td
                          key={`${team}-third-quartile`}
                          className="bg-gray-50 text-center relative p-0"
                          style={{
                            height: summaryRowHeight,
                            width: teamColWidth,
                            minWidth: teamColWidth,
                            maxWidth: teamColWidth,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                          }}
                        >
                          <div
                            className={`absolute inset-0 flex items-center justify-center`}
                            style={{
                              ...getSummaryColor(
                                summary[team]?.third_quartile || 0,
                                "quartile"
                              ),
                              fontSize: isMobile ? "12px" : "14px",
                            }}
                          >
                            {summary[team]?.third_quartile || 0}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* ✅ NEW: Bottom Quartile Row */}
                    <tr className="bg-gray-50">
                      <td
                        colSpan={3}
                        className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                        style={{
                          width:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          minWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          maxWidth:
                            firstColWidth + opponentColWidth + winProbColWidth,
                          height: summaryRowHeight,
                          position: "sticky",
                          left: 0,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderRight: "2px solid #d1d5db",
                        }}
                      >
                        Bottom Quartile
                      </td>
                      {teams.map((team) => (
                        <td
                          key={`${team}-bottom-quartile`}
                          className="bg-gray-50 text-center relative p-0"
                          style={{
                            height: summaryRowHeight,
                            width: teamColWidth,
                            minWidth: teamColWidth,
                            maxWidth: teamColWidth,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                          }}
                        >
                          <div
                            className={`absolute inset-0 flex items-center justify-center`}
                            style={{
                              ...getSummaryColor(
                                summary[team]?.bottom_quartile || 0,
                                "quartile"
                              ),
                              fontSize: isMobile ? "12px" : "14px",
                            }}
                          >
                            {summary[team]?.bottom_quartile || 0}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Legend for main table */}
          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Legend:</strong>{" "}
              <span className="inline-block w-4 h-4 bg-[#18627b] mr-1 align-middle"></span>{" "}
              Win |{" "}
              <span className="inline-block w-4 h-4 bg-yellow-100 border border-gray-300 mr-1 align-middle"></span>
              Loss |{" "}
              <span className="inline-block w-4 h-4 bg-blue-200 mr-1 align-middle"></span>
              Next Game |{" "}
              <span className="inline-block w-4 h-4 bg-gray-100 mr-1 align-middle"></span>
              Future Games |{" "}
              <span className="inline-block w-4 h-4 bg-gray-300 mr-1 align-middle"></span>
              No Game
            </p>
          </div>
        </div>
      )}

      {/* ✅ Schedule Summary Table - Only render if renderSummaryTable is true */}
      {renderSummaryTable && summary && Object.keys(summary).length > 0 && (
        <div className="mb-4">
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
                  {/* ✅ UPDATED: Team column header with new smaller width */}
                  <th
                    className={`sticky left-0 z-30 bg-gray-50 text-center font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{
                      width: summaryTeamColWidth, // ✅ Using new smaller width
                      minWidth: summaryTeamColWidth,
                      maxWidth: summaryTeamColWidth,
                      height: headerHeight,
                      position: "sticky",
                      left: 0,
                      top: 0,
                      border: "1px solid #e5e7eb",
                      borderRight: "1px solid #e5e7eb",
                    }}
                  >
                    Team
                  </th>
                  <th
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{
                      height: headerHeight,
                      width: teamColWidth,
                      minWidth: teamColWidth,
                      maxWidth: teamColWidth,
                      position: "sticky",
                      top: 0,
                      border: "1px solid #e5e7eb",
                      borderLeft: "none",
                    }}
                  >
                    {isMobile ? "Avg\nWins" : "Expected\nWins"}
                  </th>
                  <th
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{
                      height: headerHeight,
                      width: teamColWidth,
                      minWidth: teamColWidth,
                      maxWidth: teamColWidth,
                      position: "sticky",
                      top: 0,
                      border: "1px solid #e5e7eb",
                      borderLeft: "none",
                    }}
                  >
                    Total
                    <br />
                    Games
                  </th>
                  <th
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{
                      height: headerHeight,
                      width: quartileColWidth, // ✅ Using wider quartile column width
                      minWidth: quartileColWidth,
                      maxWidth: quartileColWidth,
                      position: "sticky",
                      top: 0,
                      border: "1px solid #e5e7eb",
                      borderLeft: "none",
                    }}
                  >
                    Top
                    <br />
                    Quartile
                    <br />
                    (Hardest)
                  </th>
                  <th
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{
                      height: headerHeight,
                      width: quartileColWidth, // ✅ Using wider quartile column width
                      minWidth: quartileColWidth,
                      maxWidth: quartileColWidth,
                      position: "sticky",
                      top: 0,
                      border: "1px solid #e5e7eb",
                      borderLeft: "none",
                    }}
                  >
                    2nd
                    <br />
                    Quartile
                  </th>
                  <th
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{
                      height: headerHeight,
                      width: quartileColWidth, // ✅ Using wider quartile column width
                      minWidth: quartileColWidth,
                      maxWidth: quartileColWidth,
                      position: "sticky",
                      top: 0,
                      border: "1px solid #e5e7eb",
                      borderLeft: "none",
                    }}
                  >
                    3rd
                    <br />
                    Quartile
                  </th>
                  <th
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{
                      height: headerHeight,
                      width: quartileColWidth, // ✅ Using wider quartile column width
                      minWidth: quartileColWidth,
                      maxWidth: quartileColWidth,
                      position: "sticky",
                      top: 0,
                      border: "1px solid #e5e7eb",
                      borderLeft: "none",
                    }}
                  >
                    Bottom
                    <br />
                    Quartile
                    <br />
                    (Easiest)
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary)
                  .sort(
                    ([, a], [, b]) =>
                      (b as any).expected_wins - (a as any).expected_wins
                  )
                  .map(([team, data]) => (
                    <tr key={team}>
                      {/* ✅ UPDATED: Team column cell with new smaller width */}
                      <td
                        className={`sticky left-0 z-20 bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                        style={{
                          width: summaryTeamColWidth, // ✅ Using new smaller width
                          minWidth: summaryTeamColWidth,
                          maxWidth: summaryTeamColWidth,
                          height: summaryRowHeight,
                          position: "sticky",
                          left: 0,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderRight: "1px solid #e5e7eb",
                        }}
                      >
                        <div className="flex justify-center items-center h-full">
                          <TeamLogo
                            logoUrl={
                              teamLogos[team] ||
                              "/images/team_logos/default.png"
                            }
                            teamName={team}
                            size={isMobile ? 24 : 28}
                            onClick={() => navigateToTeam(team)}
                          />
                        </div>
                      </td>
                      <td
                        className="relative p-0"
                        style={{
                          height: summaryRowHeight,
                          width: teamColWidth,
                          minWidth: teamColWidth,
                          maxWidth: teamColWidth,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderLeft: "none",
                        }}
                      >
                        <div
                          className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                          style={getSummaryColor(
                            (data as any).expected_wins,
                            "expected_wins"
                          )}
                        >
                          {(data as any).expected_wins}
                        </div>
                      </td>
                      <td
                        className="relative p-0"
                        style={{
                          height: summaryRowHeight,
                          width: teamColWidth,
                          minWidth: teamColWidth,
                          maxWidth: teamColWidth,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderLeft: "none",
                          backgroundColor: "#ffffff",
                        }}
                      >
                        <div
                          className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                        >
                          {(data as any).total_games}
                        </div>
                      </td>
                      <td
                        className="relative p-0"
                        style={{
                          height: summaryRowHeight,
                          width: quartileColWidth, // ✅ Using wider quartile column width
                          minWidth: quartileColWidth,
                          maxWidth: quartileColWidth,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderLeft: "none",
                        }}
                      >
                        <div
                          className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                          style={getSummaryColor(
                            (data as any).top_quartile,
                            "quartile"
                          )}
                        >
                          {(data as any).top_quartile}
                        </div>
                      </td>
                      <td
                        className="relative p-0"
                        style={{
                          height: summaryRowHeight,
                          width: quartileColWidth, // ✅ Using wider quartile column width
                          minWidth: quartileColWidth,
                          maxWidth: quartileColWidth,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderLeft: "none",
                        }}
                      >
                        <div
                          className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                          style={getSummaryColor(
                            (data as any).second_quartile,
                            "quartile"
                          )}
                        >
                          {(data as any).second_quartile}
                        </div>
                      </td>
                      <td
                        className="relative p-0"
                        style={{
                          height: summaryRowHeight,
                          width: quartileColWidth, // ✅ Using wider quartile column width
                          minWidth: quartileColWidth,
                          maxWidth: quartileColWidth,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderLeft: "none",
                        }}
                      >
                        <div
                          className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                          style={getSummaryColor(
                            (data as any).third_quartile,
                            "quartile"
                          )}
                        >
                          {(data as any).third_quartile}
                        </div>
                      </td>
                      <td
                        className="relative p-0"
                        style={{
                          height: summaryRowHeight,
                          width: quartileColWidth, // ✅ Using wider quartile column width
                          minWidth: quartileColWidth,
                          maxWidth: quartileColWidth,
                          border: "1px solid #e5e7eb",
                          borderTop: "none",
                          borderLeft: "none",
                        }}
                      >
                        <div
                          className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                          style={getSummaryColor(
                            (data as any).bottom_quartile,
                            "quartile"
                          )}
                        >
                          {(data as any).bottom_quartile}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ScheduleTable);
