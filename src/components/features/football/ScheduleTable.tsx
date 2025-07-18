"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { FootballScheduleData } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

interface FootballScheduleSummary {
  total_games: number;
  expected_wins: number;
  top_quartile: number;
  second_quartile: number;
  third_quartile: number;
  bottom_quartile: number;
}

interface FootballScheduleTableProps {
  scheduleData: FootballScheduleData[];
  teams: string[];
  teamLogos: Record<string, string>;
  summary: Record<string, FootballScheduleSummary>;
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

  const formatCellValue = useCallback((value: unknown): string => {
    if (value === null || value === undefined || value === "-") return "";
    if (typeof value === "object") return "";
    return String(value).trim();
  }, []);

  const getCellValue = useCallback(
    (row: FootballScheduleData, team: string): unknown => {
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
        return (row.games as Record<string, unknown>)[team];
      }

      return undefined;
    },
    []
  );

  // Filter out rows with no data
  const filteredScheduleData = useMemo(() => {
    return scheduleData.filter((row) => {
      return teams.some((team) => {
        const cellValue = getCellValue(row, team);
        const formattedValue = formatCellValue(cellValue);
        return formattedValue !== "" && formattedValue !== "-";
      });
    });
  }, [scheduleData, teams, getCellValue, formatCellValue]);

  const nextGamesForTeams = useMemo(() => {
    const nextGames: Record<string, { date: string; rowIndex: number } | null> =
      {};

    teams.forEach((team) => {
      const futureGames: { date: string; rowIndex: number }[] = [];

      filteredScheduleData.forEach((row, rowIndex) => {
        const cellValue = getCellValue(row, team);
        const formattedValue = formatCellValue(cellValue);

        if (/^\d{1,2}\/\d{1,2}$/.test(formattedValue)) {
          futureGames.push({ date: formattedValue, rowIndex });
        }
      });

      futureGames.sort((a, b) => {
        const [aMonth, aDay] = a.date.split("/").map(Number);
        const [bMonth, bDay] = b.date.split("/").map(Number);
        const currentYear = new Date().getFullYear();
        const aDate = new Date(currentYear, aMonth - 1, aDay);
        const bDate = new Date(currentYear, bMonth - 1, bDay);
        return aDate.getTime() - bDate.getTime();
      });

      nextGames[team] = futureGames.length > 0 ? futureGames[0] : null;
    });

    return nextGames;
  }, [filteredScheduleData, teams, getCellValue, formatCellValue]);

  const getCellStyle = useCallback(
    (value: string | undefined, teamName: string, rowIndex: number) => {
      if (!value || typeof value !== "string") return {};

      if (value === "W") return { backgroundColor: "#18627b", color: "white" };
      if (value === "L") return { backgroundColor: "#fff7d6", color: "black" };

      if (/^\d{1,2}\/\d{1,2}$/.test(value)) {
        const nextGame = nextGamesForTeams[teamName];
        const isNextGame =
          nextGame && nextGame.date === value && nextGame.rowIndex === rowIndex;

        if (isNextGame) {
          return { backgroundColor: "#add8e6", color: "#4b5563" };
        } else {
          return { backgroundColor: "#f0f0f0", color: "#4b5563" };
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
          ...Object.values(summary).map((team) => team.expected_wins || 0)
        );
        const minExpectedWins = Math.min(
          ...Object.values(summary).map((team) => team.expected_wins || 0)
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
          ...Object.values(summary).flatMap((team) =>
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
    !filteredScheduleData ||
    filteredScheduleData.length === 0 ||
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
                    className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                    style={{
                      width: firstColWidth,
                      minWidth: firstColWidth,
                      maxWidth: firstColWidth,
                      height: headerHeight,
                      position: "sticky",
                      left: 0,
                      top: 0,
                      border: "1px solid #e5e7eb",
                      borderRight: "1px solid #e5e7eb",
                    }}
                  >
                    Location
                  </th>

                  <th
                    className={`sticky z-30 bg-gray-50 text-center font-normal ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                    style={{
                      width: opponentColWidth,
                      minWidth: opponentColWidth,
                      maxWidth: opponentColWidth,
                      height: headerHeight,
                      position: "sticky",
                      left: firstColWidth,
                      top: 0,
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
                    className={`sticky z-30 bg-gray-50 text-center font-normal ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                    style={{
                      width: winProbColWidth,
                      minWidth: winProbColWidth,
                      maxWidth: winProbColWidth,
                      height: headerHeight,
                      position: "sticky",
                      left: firstColWidth + opponentColWidth,
                      top: 0,
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
                {filteredScheduleData.map((row, index) => (
                  <tr key={index}>
                    <td
                      className={`sticky left-0 z-20 text-center ${
                        isMobile ? "text-xs" : "text-sm"
                      }`}
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
                        ...getLocationStyle(
                          row.Loc.charAt(0).toUpperCase() +
                            row.Loc.slice(1).toLowerCase()
                        ),
                      }}
                    >
                      {row.Loc.charAt(0).toUpperCase() +
                        row.Loc.slice(1).toLowerCase()}
                    </td>

                    <td
                      className={`sticky z-20 bg-white text-center ${
                        isMobile ? "text-xs" : "text-sm"
                      }`}
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
                        <TeamLogo
                          logoUrl={
                            teamLogos[row.Team] ||
                            "/images/team_logos/default.png"
                          }
                          teamName={row.Team}
                          size={isMobile ? 16 : 20}
                          className="flex-shrink-0"
                          onClick={() => navigateToTeam(row.Team)}
                        />
                      </div>
                    </td>

                    <td
                      className={`sticky z-20 bg-white text-center ${
                        isMobile ? "text-xs" : "text-sm"
                      }`}
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
                      {formatCellValue(row.Win_Pct)}
                    </td>

                    {teams.map((team) => {
                      const cellValue = getCellValue(row, team);
                      const formattedValue = formatCellValue(cellValue);
                      const isEmpty = !formattedValue || formattedValue === "";

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
                            className={`absolute inset-0 flex items-center justify-center ${
                              isMobile ? "text-xs" : "text-sm"
                            }`}
                            style={
                              isEmpty
                                ? {}
                                : getCellStyle(formattedValue, team, index)
                            }
                          >
                            {formattedValue}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {summary && Object.keys(summary).length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td
                        colSpan={3}
                        className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${
                          isMobile ? "text-xs" : "text-sm"
                        }`}
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
                        Expected Wins
                      </td>
                      {teams.map((team) => {
                        const expectedWins = summary[team]?.expected_wins || 0;
                        return (
                          <td
                            key={`${team}-expected`}
                            className="bg-gray-50 text-center relative p-0"
                            style={{
                              height: summaryRowHeight,
                              width: teamColWidth,
                              minWidth: teamColWidth,
                              maxWidth: teamColWidth,
                              border: "1px solid #e5e7eb",
                              borderTop: "2px solid #4b5563",
                              borderLeft: "none",
                            }}
                          >
                            <div
                              className={`absolute inset-0 flex items-center justify-center`}
                              style={{
                                ...getSummaryColor(
                                  expectedWins,
                                  "expected_wins"
                                ),
                                fontSize: isMobile ? "12px" : "14px",
                              }}
                            >
                              {expectedWins.toFixed(1)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="bg-gray-50">
                      <td
                        colSpan={3}
                        className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${
                          isMobile ? "text-xs" : "text-sm"
                        }`}
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
                        Total Games
                      </td>
                      {teams.map((team) => {
                        const totalGames = summary[team]?.total_games || 0;
                        return (
                          <td
                            key={`${team}-total`}
                            className="bg-gray-50 text-center"
                            style={{
                              height: summaryRowHeight,
                              width: teamColWidth,
                              minWidth: teamColWidth,
                              maxWidth: teamColWidth,
                              border: "1px solid #e5e7eb",
                              borderTop: "none",
                              borderLeft: "none",
                              fontSize: isMobile ? "12px" : "14px",
                            }}
                          >
                            {totalGames}
                          </td>
                        );
                      })}
                    </tr>

                    {(["top", "second", "third", "bottom"] as const).map(
                      (quartile) => (
                        <tr key={quartile} className="bg-gray-50">
                          <td
                            colSpan={3}
                            className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-2 ${
                              isMobile ? "text-xs" : "text-sm"
                            }`}
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
                              ? "Top Quartile (Hardest)"
                              : quartile === "second"
                                ? "2nd Quartile"
                                : quartile === "third"
                                  ? "3rd Quartile"
                                  : "Bottom Quartile (Easiest)"}
                          </td>
                          {teams.map((team) => {
                            const teamSummary = summary[team];
                            let quartileValue = 0;

                            if (teamSummary) {
                              switch (quartile) {
                                case "top":
                                  quartileValue = teamSummary.top_quartile || 0;
                                  break;
                                case "second":
                                  quartileValue =
                                    teamSummary.second_quartile || 0;
                                  break;
                                case "third":
                                  quartileValue =
                                    teamSummary.third_quartile || 0;
                                  break;
                                case "bottom":
                                  quartileValue =
                                    teamSummary.bottom_quartile || 0;
                                  break;
                              }
                            }

                            return (
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
                                      quartileValue,
                                      "quartile"
                                    ),
                                    fontSize: isMobile ? "12px" : "14px",
                                  }}
                                >
                                  {quartileValue}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      )
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {renderSummaryTable && (
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
                    className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                    style={{
                      height: headerHeight,
                      width: summaryTeamColWidth,
                      minWidth: summaryTeamColWidth,
                      maxWidth: summaryTeamColWidth,
                      position: "sticky",
                      left: 0,
                      top: 0,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    Team
                  </th>
                  <th
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
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
                    Expected
                    <br />
                    Wins
                  </th>
                  <th
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
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
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
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
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
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
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
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
                    className={`bg-gray-50 text-center font-normal sticky z-20 ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
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
                {teams
                  .filter((team) => summary[team])
                  .sort((a, b) => {
                    const aExpectedWins = summary[a]?.expected_wins || 0;
                    const bExpectedWins = summary[b]?.expected_wins || 0;
                    return bExpectedWins - aExpectedWins;
                  })
                  .map((team) => {
                    const teamSummary = summary[team];
                    if (!teamSummary) return null;

                    return (
                      <tr key={team}>
                        <td
                          className={`sticky left-0 z-20 bg-white text-center ${
                            isMobile ? "text-xs" : "text-sm"
                          }`}
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
                              size={isMobile ? 16 : 20}
                              className="flex-shrink-0"
                              onClick={() => navigateToTeam(team)}
                            />
                          </div>
                        </td>

                        <td
                          className={`text-center ${
                            isMobile ? "text-xs" : "text-sm"
                          }`}
                          style={{
                            width: teamColWidth,
                            minWidth: teamColWidth,
                            maxWidth: teamColWidth,
                            height: summaryRowHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            ...getSummaryColor(
                              teamSummary.expected_wins || 0,
                              "expected_wins"
                            ),
                          }}
                        >
                          {teamSummary.expected_wins?.toFixed(1) || "0.0"}
                        </td>

                        <td
                          className={`text-center ${
                            isMobile ? "text-xs" : "text-sm"
                          }`}
                          style={{
                            width: teamColWidth,
                            minWidth: teamColWidth,
                            maxWidth: teamColWidth,
                            height: summaryRowHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                          }}
                        >
                          {teamSummary.total_games || 0}
                        </td>

                        <td
                          className={`text-center ${
                            isMobile ? "text-xs" : "text-sm"
                          }`}
                          style={{
                            width: quartileColWidth,
                            minWidth: quartileColWidth,
                            maxWidth: quartileColWidth,
                            height: summaryRowHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            ...getSummaryColor(
                              teamSummary.top_quartile || 0,
                              "quartile"
                            ),
                          }}
                        >
                          {teamSummary.top_quartile || 0}
                        </td>

                        <td
                          className={`text-center ${
                            isMobile ? "text-xs" : "text-sm"
                          }`}
                          style={{
                            width: quartileColWidth,
                            minWidth: quartileColWidth,
                            maxWidth: quartileColWidth,
                            height: summaryRowHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            ...getSummaryColor(
                              teamSummary.second_quartile || 0,
                              "quartile"
                            ),
                          }}
                        >
                          {teamSummary.second_quartile || 0}
                        </td>

                        <td
                          className={`text-center ${
                            isMobile ? "text-xs" : "text-sm"
                          }`}
                          style={{
                            width: quartileColWidth,
                            minWidth: quartileColWidth,
                            maxWidth: quartileColWidth,
                            height: summaryRowHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            ...getSummaryColor(
                              teamSummary.third_quartile || 0,
                              "quartile"
                            ),
                          }}
                        >
                          {teamSummary.third_quartile || 0}
                        </td>

                        <td
                          className={`text-center ${
                            isMobile ? "text-xs" : "text-sm"
                          }`}
                          style={{
                            width: quartileColWidth,
                            minWidth: quartileColWidth,
                            maxWidth: quartileColWidth,
                            height: summaryRowHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            ...getSummaryColor(
                              teamSummary.bottom_quartile || 0,
                              "quartile"
                            ),
                          }}
                        >
                          {teamSummary.bottom_quartile || 0}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(FootballScheduleTable);
