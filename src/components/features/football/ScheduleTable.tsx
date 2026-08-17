"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { formatTeamName } from "@/lib/formatTeamName";
import { cn } from "@/lib/utils";
import { FootballScheduleData } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, ReactNode, useCallback, useMemo } from "react";
import styles from "./ScheduleTable.module.css";

interface FootballScheduleSummary {
  total_games: number;
  expected_wins: number;
  top_quartile: number;
  second_quartile: number;
  third_quartile: number;
  bottom_quartile: number;
}

interface WinProbBucket {
  key: "b0_30" | "b30_45" | "b45_55" | "b55_70" | "b70_100";
  label: string;
  tag: "Hardest" | "Easiest" | null;
  max: number;
}

const WIN_PROB_BUCKETS: WinProbBucket[] = [
  { key: "b0_30", label: "0-30%", tag: "Hardest", max: 0.3 },
  { key: "b30_45", label: "30-45%", tag: null, max: 0.45 },
  { key: "b45_55", label: "45-55%", tag: null, max: 0.55 },
  { key: "b55_70", label: "55-70%", tag: null, max: 0.7 },
  { key: "b70_100", label: "70-100%", tag: "Easiest", max: 1 },
];

function getWinProbBucketKey(rawValue: number | undefined): WinProbBucket["key"] {
  const value = typeof rawValue === "number" ? rawValue : 0;
  const bucket = WIN_PROB_BUCKETS.find((b) => value <= b.max);
  return (bucket ?? WIN_PROB_BUCKETS[WIN_PROB_BUCKETS.length - 1]).key;
}

function getBucketLabel(bucket: WinProbBucket, count: number): string {
  return bucket.tag
    ? `${bucket.label} (${bucket.tag}; ${count} possible)`
    : `${bucket.label} (${count} possible)`;
}

interface FootballScheduleTableProps {
  scheduleData: FootballScheduleData[];
  teams: string[];
  teamLogos: Record<string, string>;
  summary: Record<string, FootballScheduleSummary>;
  className?: string;
  renderMainTable?: boolean;
  renderSummaryTable?: boolean;
  season?: string;
  /** Optional element (e.g. conference selector) rendered on the right of the main table's title row. */
  headerRight?: ReactNode;
}

function FootballScheduleTable({
  scheduleData,
  teams,
  teamLogos,
  summary,
  className,
  renderMainTable = true,
  renderSummaryTable = true,
  season,
  headerRight,
}: FootballScheduleTableProps) {
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      const path = season
        ? `/football/${season}/team/${encodeURIComponent(teamName)}`
        : `/football/team/${encodeURIComponent(teamName)}`;
      router.push(path);
    },
    [router, season],
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
      return `${month}/${day}`;
    }
    if (parts.length === 2) {
      const month = parts[0].padStart(2, "0");
      const day = parts[1].padStart(2, "0");
      return `${month}/${day}`;
    }
    return dateStr;
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
    [],
  );

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

        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(formattedValue)) {
          futureGames.push({ date: formattedValue, rowIndex });
        }
      });

      futureGames.sort((a, b) => {
        const aDateParts = a.date.split("/").map(Number);
        const bDateParts = b.date.split("/").map(Number);
        const aDate = new Date(aDateParts[2], aDateParts[0] - 1, aDateParts[1]);
        const bDate = new Date(bDateParts[2], bDateParts[0] - 1, bDateParts[1]);
        return aDate.getTime() - bDate.getTime();
      });

      nextGames[team] = futureGames.length > 0 ? futureGames[0] : null;
    });

    return nextGames;
  }, [filteredScheduleData, teams, getCellValue, formatCellValue]);

  const bucketCounts = useMemo(() => {
    const rowCounts: Record<WinProbBucket["key"], number> = {
      b0_30: 0,
      b30_45: 0,
      b45_55: 0,
      b55_70: 0,
      b70_100: 0,
    };
    const teamCounts: Record<string, Record<WinProbBucket["key"], number>> = {};
    teams.forEach((team) => {
      teamCounts[team] = { b0_30: 0, b30_45: 0, b45_55: 0, b55_70: 0, b70_100: 0 };
    });

    filteredScheduleData.forEach((row) => {
      const bucketKey = getWinProbBucketKey(row.Win_Pct_Raw);
      rowCounts[bucketKey] += 1;

      teams.forEach((team) => {
        const cellValue = getCellValue(row, team);
        const formattedValue = formatCellValue(cellValue);
        if (formattedValue !== "" && formattedValue !== "-") {
          teamCounts[team][bucketKey] += 1;
        }
      });
    });

    return { rowCounts, teamCounts };
  }, [filteredScheduleData, teams, getCellValue, formatCellValue]);

  const getCellStyle = useCallback(
    (value: string | undefined, teamName: string, rowIndex: number) => {
      if (!value || typeof value !== "string") return {};

      if (value === "W") return { backgroundColor: "#18627b", color: "white" };
      if (value === "L") return { backgroundColor: "#ffe671", color: "black" };

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
    [nextGamesForTeams],
  );

  const getSummaryColor = useCallback(
    (value: number, type: string) => {
      if (type === "expected_wins") {
        const maxExpectedWins = Math.max(
          ...Object.values(summary).map((team) => team.expected_wins || 0),
        );
        const minExpectedWins = Math.min(
          ...Object.values(summary).map((team) => team.expected_wins || 0),
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
      } else if (type === "bucket") {
        const maxBucket = Math.max(
          1,
          ...Object.values(bucketCounts.teamCounts).flatMap((counts) =>
            Object.values(counts),
          ),
        );

        const intensity = value / maxBucket;
        const r = Math.round(195 - (195 - 24) * intensity);
        const g = Math.round(224 - (224 - 98) * intensity);
        const b = Math.round(236 - (236 - 123) * intensity);
        const textColor = intensity > 0.5 ? "white" : "black";
        return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: textColor };
      }
      return { backgroundColor: "var(--bg-primary)" };
    },
    [summary, bucketCounts],
  );

  if (
    !filteredScheduleData ||
    filteredScheduleData.length === 0 ||
    !teams ||
    teams.length === 0
  ) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No football schedule data available
      </div>
    );
  }

  return (
    <>
      {renderMainTable && (
        <section
          className={cn(styles.card, "football-schedule-table", className)}
          aria-labelledby="football-schedule-title"
        >
          <div className={styles.cardHeader}>
            <div className={styles.titleGroup} data-screenshot-hide="true">
              <h2 id="football-schedule-title" className={styles.title}>
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
                <tr className={styles.mainHeaderRow}>
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
                        <span className={styles.teamName} data-screenshot-label>
                          {formatTeamName(team)}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredScheduleData.map((row, index) => {
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

                  {WIN_PROB_BUCKETS.map((bucket) => (
                    <tr key={bucket.key}>
                      <th colSpan={3} className={styles.summaryLabel} scope="row">
                        {getBucketLabel(bucket, bucketCounts.rowCounts[bucket.key])}
                      </th>
                      {teams.map((team) => {
                        const bucketValue = bucketCounts.teamCounts[team]?.[bucket.key] || 0;

                        return (
                          <td
                            key={`${team}-${bucket.key}`}
                            className={styles.summaryValue}
                          >
                            <div
                              className={styles.summaryChip}
                              style={getSummaryColor(bucketValue, "bucket")}
                            >
                              {bucketValue}
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
          className={cn(styles.card, "football-schedule-summary-table", className)}
          aria-label="Schedule difficulty summary by win probability"
        >
          <div
            className={cn(styles.scrollViewport, styles.scrollViewportNoHeader)}
            role="region"
            aria-label="Schedule difficulty summary by win probability. Scroll to see every team."
            tabIndex={0}
          >
            <table className={cn(styles.table, styles.compactTable)}>
              <thead>
                <tr>
                  <th
                    className={cn(styles.stickyColumn, styles.summaryTeamHeader)}
                    scope="col"
                    rowSpan={2}
                  >
                    Team
                  </th>
                  <th className={styles.summaryStatHeader} scope="col" rowSpan={2}>
                    Expected
                    <br />
                    Wins
                  </th>
                  <th className={styles.summaryStatHeader} scope="col" rowSpan={2}>
                    Total
                    <br />
                    Games
                  </th>
                  <th
                    className={styles.summaryStatHeader}
                    scope="colgroup"
                    colSpan={WIN_PROB_BUCKETS.length}
                  >
                    Probability team would win against an average conference team
                  </th>
                </tr>
                <tr>
                  {WIN_PROB_BUCKETS.map((bucket) => (
                    <th
                      key={bucket.key}
                      className={cn(
                        styles.summaryStatHeader,
                        styles.summaryBucketHeader,
                      )}
                      scope="col"
                    >
                      {bucket.label}
                      {bucket.tag && (
                        <>
                          <br />
                          {`(${bucket.tag})`}
                        </>
                      )}
                      <br />
                      {`(${bucketCounts.rowCounts[bucket.key]} possible)`}
                    </th>
                  ))}
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
                            <span className={styles.summaryTeamName} data-screenshot-label>
                              {team}
                            </span>
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

                        {WIN_PROB_BUCKETS.map((bucket) => {
                          const bucketValue = bucketCounts.teamCounts[team]?.[bucket.key] || 0;
                          return (
                            <td key={`${team}-${bucket.key}-summary`} className={styles.statCell}>
                              <div
                                className={styles.summaryChip}
                                style={getSummaryColor(bucketValue, "bucket")}
                              >
                                {bucketValue}
                              </div>
                            </td>
                          );
                        })}
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

export default memo(FootballScheduleTable);
