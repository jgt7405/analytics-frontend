"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { FootballScheduleData } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

interface FootballScheduleTableProps {
  scheduleData: FootballScheduleData[];
  teams: string[];
  teamLogos: Record<string, string>;
  summary: Record<string, any>;
  className?: string;
  renderMainTable?: boolean;
  renderSummaryTable?: boolean;
}

function FootballScheduleTable({
  scheduleData,
  teams,
  teamLogos,
  summary,
  className,
  renderMainTable = true,
  renderSummaryTable = true,
}: FootballScheduleTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/football/team/${encodeURIComponent(teamName)}`);
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

  const formatCellValue = useCallback((value: any): string => {
    if (value === null || value === undefined || value === "-") return "";
    if (typeof value === "object") return "";
    return String(value).trim();
  }, []);

  // ✅ MOVED: Define getCellValue BEFORE it's used in useMemo
  const getCellValue = useCallback(
    (row: FootballScheduleData, team: string): any => {
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
    },
    []
  );

  // ✅ NOW: Calculate next games for each team (after getCellValue is defined)
  const nextGamesForTeams = useMemo(() => {
    const nextGames: Record<string, { date: string; rowIndex: number } | null> =
      {};

    teams.forEach((team) => {
      // Get all future games for this team
      const futureGames = scheduleData
        .map((row, idx) => {
          const cellValue = getCellValue(row, team);
          return {
            date: cellValue,
            rowIndex: idx,
          };
        })
        .filter(
          (game) =>
            game.date &&
            typeof game.date === "string" &&
            /^\d{1,2}\/\d{1,2}$/.test(game.date) &&
            game.date !== "-"
        )
        .sort((a, b) => {
          // Sort by date to find the earliest upcoming game
          const [monthA, dayA] = a.date.split("/").map(Number);
          const [monthB, dayB] = b.date.split("/").map(Number);

          // Create dates for comparison (assuming 2025 for future games)
          const dateA = new Date(2025, monthA - 1, dayA);
          const dateB = new Date(2025, monthB - 1, dayB);

          return dateA.getTime() - dateB.getTime();
        });

      // The first game in the sorted array is the next game
      nextGames[team] = futureGames.length > 0 ? futureGames[0] : null;
    });

    return nextGames;
  }, [scheduleData, teams, getCellValue]); // ✅ Add getCellValue to dependencies

  // ✅ UPDATED: Improved cell styling with next game logic
  const getCellStyle = useCallback(
    (value: string | undefined, teamName: string, rowIndex: number) => {
      if (!value || typeof value !== "string") return {};

      // Match basketball schedule colors exactly
      if (value === "W") return { backgroundColor: "#18627b", color: "white" }; // Win color
      if (value === "L") return { backgroundColor: "#fff7d6", color: "black" }; // Loss color
      if (value === "T") return { backgroundColor: "#e6e6fa", color: "black" }; // Tie color

      // For dates, check if this is the next upcoming game for this team
      if (/^\d{1,2}\/\d{1,2}$/.test(value)) {
        const nextGame = nextGamesForTeams[teamName];
        const isNextGame =
          nextGame && nextGame.date === value && nextGame.rowIndex === rowIndex;

        if (isNextGame) {
          return { backgroundColor: "#add8e6", color: "#4b5563" }; // Next game color (light blue)
        } else {
          return { backgroundColor: "#f0f0f0", color: "#4b5563" }; // Future games color (light gray)
        }
      }

      return {};
    },
    [nextGamesForTeams]
  );

  const getSummaryColor = useCallback(
    (value: number, type: string) => {
      if (type === "expected_wins") {
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

  // Same dimensions as basketball schedule
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 40 : 48;
  const summaryRowHeight = isMobile ? 24 : 28;
  const firstColWidth = isMobile ? 60 : 80;
  const opponentColWidth = isMobile ? 45 : 80;
  const winProbColWidth = isMobile ? 80 : 100;
  const teamColWidth = isMobile ? 40 : 60;
  const quartileColWidth = isMobile ? 50 : 70;
  const summaryTeamColWidth = isMobile ? 55 : 75;

  const tableClassName = cn(
    tableStyles.tableContainer,
    "football-schedule-table",
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
        No football schedule data available
      </div>
    );
  }

  return (
    <div>
      {/* Main Schedule Table */}
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

                    {/* ✅ UPDATED: Team Game Cells with correct next game highlighting */}
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
                            backgroundColor: isEmpty
                              ? "#d1d5db"
                              : "transparent",
                          }}
                        >
                          <div
                            className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                            style={
                              isEmpty
                                ? {}
                                : getCellStyle(displayValue, team, index)
                            }
                          >
                            {displayValue}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Summary Rows */}
                {summary && Object.keys(summary).length > 0 && (
                  <>
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

                    {/* Quartile rows */}
                    {["top", "second", "third", "bottom"].map((quartile) => (
                      <tr key={quartile} className="bg-gray-50">
                        <td
                          colSpan={3}
                          className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                          style={{
                            width:
                              firstColWidth +
                              opponentColWidth +
                              winProbColWidth,
                            minWidth:
                              firstColWidth +
                              opponentColWidth +
                              winProbColWidth,
                            maxWidth:
                              firstColWidth +
                              opponentColWidth +
                              winProbColWidth,
                            height: summaryRowHeight,
                            position: "sticky",
                            left: 0,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderRight: "2px solid #d1d5db",
                          }}
                        >
                          {quartile === "top"
                            ? "Top Quartile"
                            : quartile === "second"
                              ? "Second Quartile"
                              : quartile === "third"
                                ? "Third Quartile"
                                : "Bottom Quartile"}
                        </td>
                        {teams.map((team) => (
                          <td
                            key={`${team}-${quartile}-quartile`}
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
                                  summary[team]?.[`${quartile}_quartile`] || 0,
                                  "quartile"
                                ),
                                fontSize: isMobile ? "12px" : "14px",
                              }}
                            >
                              {summary[team]?.[`${quartile}_quartile`] || 0}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

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

      {/* Schedule Summary Table */}
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
                  <th
                    className={`sticky left-0 z-30 bg-gray-50 text-center font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{
                      width: summaryTeamColWidth,
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
                      width: quartileColWidth,
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
                      width: quartileColWidth,
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
                      width: quartileColWidth,
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
                      width: quartileColWidth,
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
                      <td
                        className={`sticky left-0 z-20 bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                        style={{
                          width: summaryTeamColWidth,
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
                      {[
                        "top_quartile",
                        "second_quartile",
                        "third_quartile",
                        "bottom_quartile",
                      ].map((quartileKey) => (
                        <td
                          key={quartileKey}
                          className="relative p-0"
                          style={{
                            height: summaryRowHeight,
                            width: quartileColWidth,
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
                              (data as any)[quartileKey],
                              "quartile"
                            )}
                          >
                            {(data as any)[quartileKey]}
                          </div>
                        </td>
                      ))}
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

export default memo(FootballScheduleTable);
