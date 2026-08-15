"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { formatTeamName } from "@/lib/formatTeamName";
import { cn } from "@/lib/utils";
import { ScheduleData } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { memo, ReactNode, useCallback, useMemo } from "react";
import styles from "./ScheduleTable.module.css";

// Basketball-specific summary interface
interface BasketballScheduleSummary {
  total_games: number;
  expected_wins: number;
  top_quartile: number;
  second_quartile: number;
  third_quartile: number;
  bottom_quartile: number;
}

// Basketball-specific props interface
interface BasketballScheduleTableProps {
  scheduleData: ScheduleData[];
  teams: string[];
  teamLogos: Record<string, string>;
  summary: Record<string, BasketballScheduleSummary>;
  className?: string;
  renderMainTable?: boolean;
  renderSummaryTable?: boolean;
  season?: string;
  /** Optional element (e.g. conference selector) rendered on the right of the main table's title row. */
  headerRight?: ReactNode;
}

function BasketballScheduleTable({
  scheduleData,
  teams,
  teamLogos,
  summary,
  className,
  renderMainTable = true,
  renderSummaryTable = true,
  season,
  headerRight,
}: BasketballScheduleTableProps) {
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      const path = season
        ? `/basketball/${season}/team/${encodeURIComponent(teamName)}`
        : `/basketball/team/${encodeURIComponent(teamName)}`;
      router.push(path);
    },
    [router, season]
  );

  const getLocationStyle = useCallback((location: string) => {
    switch (location) {
      case "Home":
        return { backgroundColor: "#e6f3f8" };
      case "Away":
        return { backgroundColor: "#fffff6" };
      case "Neutral":
        return { backgroundColor: "#f8f8fe" };
      default:
        return { backgroundColor: "var(--bg-secondary)" };
    }
  }, []);

  const formatCellValue = useCallback((value: unknown): string => {
    if (value === null || value === undefined || value === "-") return "";
    if (typeof value === "object") return "";
    return String(value).trim();
  }, []);

  const formatDateForDisplay = useCallback((dateStr: string): string => {
    // If date includes year (M/D/YYYY or MM/DD/YYYY), strip it and format with leading zeros
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const month = parts[0].padStart(2, "0");
      const day = parts[1].padStart(2, "0");
      return `${month}/${day}`; // Return MM/DD with leading zeros
    }
    // If already MM/DD format, ensure leading zeros
    if (parts.length === 2) {
      const month = parts[0].padStart(2, "0");
      const day = parts[1].padStart(2, "0");
      return `${month}/${day}`;
    }
    return dateStr; // Return as-is for other formats (W, L, etc.)
  }, []);

  const getCellValue = useCallback(
    (row: ScheduleData, team: string): unknown => {
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

  // Calculate next upcoming games for each team
  const nextGamesForTeams = useMemo(() => {
    const nextGames: Record<string, { date: string; rowIndex: number } | null> =
      {};

    teams.forEach((team) => {
      const futureGames: { date: string; rowIndex: number }[] = [];

      scheduleData.forEach((row, rowIndex) => {
        const cellValue = getCellValue(row, team);
        const formattedValue = formatCellValue(cellValue);

        // Check if this is a date (future game)
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(formattedValue)) {
          futureGames.push({ date: formattedValue, rowIndex });
        }
      });

      // Sort by date to find the earliest upcoming game
      futureGames.sort((a, b) => {
        const aDateParts = a.date.split("/").map(Number);
        const bDateParts = b.date.split("/").map(Number);

        // Parse date format: MM/DD/YYYY
        const aDate = new Date(aDateParts[2], aDateParts[0] - 1, aDateParts[1]);
        const bDate = new Date(bDateParts[2], bDateParts[0] - 1, bDateParts[1]);

        return aDate.getTime() - bDate.getTime();
      });

      nextGames[team] = futureGames.length > 0 ? futureGames[0] : null;
    });

    return nextGames;
  }, [scheduleData, teams, getCellValue, formatCellValue]);

  const getCellStyle = useCallback(
    (value: string | undefined, teamName: string, rowIndex: number) => {
      if (!value || typeof value !== "string") return {};

      // Game results
      if (value === "W") return { backgroundColor: "#18627b", color: "white" }; // CWV win color
      if (value === "L") return { backgroundColor: "#ffe671", color: "black" }; // CWV loss color

      // Future games (dates)
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
        const nextGame = nextGamesForTeams[teamName];
        const isNextGame =
          nextGame && nextGame.date === value && nextGame.rowIndex === rowIndex;

        return isNextGame
          ? { backgroundColor: "#d6ebf2", color: "#4b5563" }
          : { backgroundColor: "#f0f0f0", color: "#4b5563" };
      }

      return {};
    },
    [nextGamesForTeams]
  );

  const getSummaryColor = useCallback(
    (value: number, type: string) => {
      if (type === "expected_wins") {
        // Green gradient for expected wins
        const maxExpectedWins = Math.max(
          ...Object.values(summary).map(
            (team: BasketballScheduleSummary) => team.expected_wins || 0
          )
        );
        const minExpectedWins = Math.min(
          ...Object.values(summary).map(
            (team: BasketballScheduleSummary) => team.expected_wins || 0
          )
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
          ...Object.values(summary).flatMap((team: BasketballScheduleSummary) =>
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
      return { backgroundColor: "var(--bg-primary)" };
    },
    [summary]
  );

  if (
    !scheduleData ||
    scheduleData.length === 0 ||
    !teams ||
    teams.length === 0
  ) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No basketball schedule data available
      </div>
    );
  }

  return (
    <>
      {renderMainTable && (
        <section
          className={cn(styles.card, "basketball-schedule-table", className)}
          aria-labelledby="basketball-schedule-title"
        >
          <div className={styles.cardHeader}>
            <div className={styles.titleGroup} data-screenshot-hide="true">
              <h2 id="basketball-schedule-title" className={styles.title}>
                Full Schedule
              </h2>
            </div>
            {headerRight && (
              <div data-screenshot-hide="true">{headerRight}</div>
            )}
          </div>

          <div
            className={styles.scrollViewport}
            role="region"
            aria-label="Full schedule by team. Scroll to see every game and team."
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={cn(styles.stickyLocation, styles.rowHeader)} scope="col">
                    <span className={styles.rowHeaderFull}>Location</span>
                    <span className={styles.rowHeaderShort}>Loc</span>
                  </th>
                  <th className={cn(styles.stickyOpponent, styles.rowHeader)} scope="col">
                    <span className={styles.rowHeaderFull}>Opponent</span>
                    <span className={styles.rowHeaderShort}>Opp</span>
                  </th>
                  <th className={cn(styles.stickyWinProb, styles.rowHeader)} scope="col">
                    Avg Conf Win Prob
                  </th>
                  {teams.map((team) => (
                    <th
                      key={team}
                      className={styles.teamHeader}
                      scope="col"
                      data-screenshot-team-header="true"
                    >
                      <button
                        type="button"
                        className={styles.teamButton}
                        onClick={() => navigateToTeam(team)}
                        aria-label={`View ${team}`}
                      >
                        <TeamLogo
                          logoUrl={teamLogos[team] || "/images/team_logos/default.png"}
                          teamName={team}
                          size={32}
                          showTooltip
                          className={styles.teamLogo}
                        />
                        <span className={styles.teamName}>{formatTeamName(team)}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {scheduleData.map((row, index) => {
                  const location =
                    row.Loc.charAt(0).toUpperCase() + row.Loc.slice(1).toLowerCase();

                  return (
                    <tr key={index}>
                      <td
                        className={styles.stickyLocation}
                        style={getLocationStyle(location)}
                      >
                        <div className={styles.rowLabel}>{location}</div>
                      </td>

                      <td className={styles.stickyOpponent}>
                        <div className={styles.rowLabel}>
                          <TeamLogo
                            logoUrl={
                              teamLogos[row.Team] || "/images/team_logos/default.png"
                            }
                            teamName={row.Team}
                            size={26}
                            showTooltip
                            className="flex-shrink-0"
                          />
                        </div>
                      </td>

                      <td className={styles.stickyWinProb}>
                        <div className={styles.rowLabel}>
                          {formatCellValue(row.Win_Pct)}
                        </div>
                      </td>

                      {teams.map((team) => {
                        const cellValue = getCellValue(row, team);
                        const formattedValue = formatCellValue(cellValue);
                        const isEmpty = !formattedValue || formattedValue === "";

                        return (
                          <td
                            key={team}
                            className={styles.gameCell}
                            data-screenshot-tile="true"
                          >
                            <div
                              className={cn(styles.gameTile, isEmpty && styles.byeTile)}
                              style={isEmpty ? {} : getCellStyle(formattedValue, team, index)}
                            >
                              {isEmpty ? "" : formatDateForDisplay(formattedValue)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

              {summary && Object.keys(summary).length > 0 && (
                <tfoot>
                  <tr className={styles.summaryRow}>
                    <th colSpan={3} className={styles.summaryLabel} scope="row">
                      Expected Wins
                    </th>
                    {teams.map((team) => {
                      const expectedWins = summary[team]?.expected_wins || 0;
                      return (
                        <td key={`${team}-expected`} className={styles.summaryValue}>
                          <div
                            className={styles.summaryChip}
                            style={getSummaryColor(expectedWins, "expected_wins")}
                          >
                            {expectedWins.toFixed(1)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <th colSpan={3} className={styles.summaryLabel} scope="row">
                      Total Games
                    </th>
                    {teams.map((team) => (
                      <td key={`${team}-total`} className={styles.summaryValue}>
                        <div className={styles.summaryChip}>
                          {summary[team]?.total_games || 0}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {(["top", "second", "third", "bottom"] as const).map((quartile) => (
                    <tr key={quartile}>
                      <th colSpan={3} className={styles.summaryLabel} scope="row">
                        {quartile === "top"
                          ? "Top Quartile (Hardest)"
                          : quartile === "second"
                            ? "2nd Quartile"
                            : quartile === "third"
                              ? "3rd Quartile"
                              : "Bottom Quartile (Easiest)"}
                      </th>
                      {teams.map((team) => {
                        const teamSummary = summary[team];
                        const quartileValue =
                          teamSummary?.[`${quartile}_quartile`] || 0;

                        return (
                          <td
                            key={`${team}-${quartile}-quartile`}
                            className={styles.summaryValue}
                          >
                            <div
                              className={styles.summaryChip}
                              style={getSummaryColor(quartileValue, "quartile")}
                            >
                              {quartileValue}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}

      {renderSummaryTable && (
        <section
          className={cn(styles.card, "basketball-schedule-summary-table", className)}
          aria-label="Schedule difficulty summary by quartile"
        >
          <div
            className={cn(styles.scrollViewport, styles.scrollViewportNoHeader)}
            role="region"
            aria-label="Schedule difficulty summary by quartile. Scroll to see every team."
            tabIndex={0}
          >
            <table className={cn(styles.table, styles.compactTable)}>
              <thead>
                <tr>
                  <th className={cn(styles.stickyColumn, styles.summaryTeamHeader)} scope="col">
                    Team
                  </th>
                  <th className={styles.summaryStatHeader} scope="col">
                    Expected
                    <br />
                    Wins
                  </th>
                  <th className={styles.summaryStatHeader} scope="col">
                    Total
                    <br />
                    Games
                  </th>
                  <th className={styles.summaryStatHeader} scope="col">
                    Top
                    <br />
                    Quartile
                    <br />
                    (Hardest)
                  </th>
                  <th className={styles.summaryStatHeader} scope="col">
                    2nd
                    <br />
                    Quartile
                  </th>
                  <th className={styles.summaryStatHeader} scope="col">
                    3rd
                    <br />
                    Quartile
                  </th>
                  <th className={styles.summaryStatHeader} scope="col">
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
                        <th className={styles.stickyColumn} scope="row">
                          <button
                            type="button"
                            className={styles.summaryTeamButton}
                            onClick={() => navigateToTeam(team)}
                            aria-label={`View ${team}`}
                          >
                            <TeamLogo
                              logoUrl={teamLogos[team] || "/images/team_logos/default.png"}
                              teamName={team}
                              size={26}
                              showTooltip
                              className={styles.teamLogo}
                            />
                            <span className={styles.summaryTeamName}>{formatTeamName(team)}</span>
                          </button>
                        </th>

                        <td className={styles.statCell}>
                          <div
                            className={styles.summaryChip}
                            style={getSummaryColor(teamSummary.expected_wins || 0, "expected_wins")}
                          >
                            {teamSummary.expected_wins?.toFixed(1) || "0.0"}
                          </div>
                        </td>

                        <td className={styles.statCell}>
                          <div className={styles.summaryChip}>
                            {teamSummary.total_games || 0}
                          </div>
                        </td>

                        <td className={styles.statCell}>
                          <div
                            className={styles.summaryChip}
                            style={getSummaryColor(teamSummary.top_quartile || 0, "quartile")}
                          >
                            {teamSummary.top_quartile || 0}
                          </div>
                        </td>

                        <td className={styles.statCell}>
                          <div
                            className={styles.summaryChip}
                            style={getSummaryColor(teamSummary.second_quartile || 0, "quartile")}
                          >
                            {teamSummary.second_quartile || 0}
                          </div>
                        </td>

                        <td className={styles.statCell}>
                          <div
                            className={styles.summaryChip}
                            style={getSummaryColor(teamSummary.third_quartile || 0, "quartile")}
                          >
                            {teamSummary.third_quartile || 0}
                          </div>
                        </td>

                        <td className={styles.statCell}>
                          <div
                            className={styles.summaryChip}
                            style={getSummaryColor(teamSummary.bottom_quartile || 0, "quartile")}
                          >
                            {teamSummary.bottom_quartile || 0}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

export default memo(BasketballScheduleTable);
