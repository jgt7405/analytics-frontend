"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { formatTeamName } from "@/lib/formatTeamName";
import { cn } from "@/lib/utils";
import {
  classifyWinTotal,
  inferTotalGames,
} from "@/lib/winsReachability";
import { regConfRecord } from "@/lib/footballRecords";
import { FootballStanding } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";
import styles from "./FootballWinsTable.module.css";

interface FootballWinsTableProps {
  standings: FootballStanding[];
  className?: string;
  season?: string;
}

// Same blue hues as the shared color scale, but win-distribution values
// rarely exceed ~45-50%, so the ramp saturates to its darkest shade by 45%
// rather than by 100%, and a sub-linear curve keeps low percentages (1-2%)
// noticeably lighter than the old linear mapping.
const WINS_CELL_MAX = 45;
const WINS_LIGHT = [195, 224, 236];
const WINS_DARK = [24, 98, 123];

function getWinCellColor(value: number): { backgroundColor: string; color: string } {
  const normalized = Math.min(Math.max(value, 0) / WINS_CELL_MAX, 1);
  const intensity = Math.pow(normalized, 0.6);

  const r = Math.round(WINS_LIGHT[0] + (WINS_DARK[0] - WINS_LIGHT[0]) * intensity);
  const g = Math.round(WINS_LIGHT[1] + (WINS_DARK[1] - WINS_LIGHT[1]) * intensity);
  const b = Math.round(WINS_LIGHT[2] + (WINS_DARK[2] - WINS_LIGHT[2]) * intensity);

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: intensity >= 0.45 ? "#ffffff" : "var(--wins-cell-text)",
  };
}

function formatConferenceName(conference?: string) {
  return conference?.replace(/_/g, " ") || "Conference";
}

function FootballWinsTable({
  standings,
  className,
  season,
}: FootballWinsTableProps) {
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

  const sortedTeams = useMemo(
    () =>
      [...standings].sort(
        (a, b) => (b.conf_wins_proj ?? 0) - (a.conf_wins_proj ?? 0),
      ),
    [standings],
  );

  const winColumns = useMemo(() => {
    let maxWins = 0;

    for (const team of standings) {
      const distributionWins = Object.keys(
        team.conf_wins_distribution ?? {},
      ).map(Number);
      if (distributionWins.length > 0) {
        maxWins = Math.max(maxWins, ...distributionWins);
      }
    }

    return Array.from({ length: maxWins + 1 }, (_, index) => maxWins - index);
  }, [standings]);

  // Season length, used to tell "can no longer reach this" apart from
  // "possible but rounds to 0%". See lib/winsReachability.
  const totalGames = useMemo(
    () =>
      inferTotalGames(
        standings.map((team) => ({
          losses: regConfRecord(team).losses,
          distribution: team.conf_wins_distribution,
        })),
      ),
    [standings],
  );

  const peakProbabilityByTeam = useMemo(
    () =>
      new Map(
        sortedTeams.map((team) => [
          team.team_id,
          Math.max(0, ...Object.values(team.conf_wins_distribution ?? {})),
        ]),
      ),
    [sortedTeams],
  );

  if (!standings.length) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No wins data available
      </div>
    );
  }

  const conferenceName = formatConferenceName(sortedTeams[0]?.conference);

  return (
    <section
      className={cn(styles.card, "wins-table", className)}
      aria-labelledby="football-win-distribution-title"
    >
      <div className={styles.cardHeader} data-screenshot-hide="true">
        <div className={styles.titleGroup}>
          <h2
            id="football-win-distribution-title"
            className={styles.title}
          >
            Projected Conference Win Distribution
          </h2>
        </div>
      </div>

      <div
        className={styles.scrollViewport}
        role="region"
        aria-label={`${conferenceName} projected conference win distribution. Scroll horizontally to see every team.`}
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={cn(styles.stickyColumn, styles.winsHeader)} scope="col">
                Conf Wins
              </th>
              {sortedTeams.map((team) => (
                  <th
                    key={`${team.team_id}-${team.team_name}`}
                    className={styles.teamHeader}
                    scope="col"
                    data-screenshot-team-header="true"
                  >
                    <button
                      type="button"
                      className={styles.teamButton}
                      onClick={() => navigateToTeam(team.team_name)}
                      aria-label={`View ${team.team_name}`}
                    >
                      <TeamLogo
                        logoUrl={team.logo_url}
                        teamName={team.team_name}
                        size={32}
                        showTooltip
                        className={styles.teamLogo}
                      />
                      <span className={styles.teamName}>
                        {formatTeamName(team.team_name)}
                      </span>
                    </button>
                  </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr>
              <th
                className={cn(styles.stickyColumn, styles.summaryLabel)}
                scope="row"
              >
                Average
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_id}-${team.team_name}-average`}
                  className={styles.summaryValue}
                >
                  <div className={styles.summaryChip}>
                    {(team.conf_wins_proj ?? 0).toFixed(1)}
                  </div>
                </td>
              ))}
            </tr>
            {winColumns.map((wins) => (
              <tr key={`wins-${wins}`}>
                <th
                  className={cn(styles.stickyColumn, styles.winLabel)}
                  scope="row"
                >
                  {wins}
                </th>
                {sortedTeams.map((team) => {
                  const winsKey = wins.toString();
                  const distribution = team.conf_wins_distribution ?? {};
                  const hasData = Object.prototype.hasOwnProperty.call(
                    distribution,
                    winsKey,
                  );
                  const percentage = hasData ? distribution[winsKey] : 0;
                  const rounded = Math.round(percentage);
                  const outcome = classifyWinTotal(
                    wins,
                    {
                      actualWins: regConfRecord(team).wins,
                      actualLosses: regConfRecord(team).losses,
                    },
                    totalGames,
                  );
                  // A blank cell shows the glyph on its own. A cell that
                  // already carries a probability keeps the number and gets
                  // the check as a corner badge instead, so neither piece of
                  // information crowds the other out.
                  const mark = outcome === "open" ? null : outcome;
                  const showGlyph = !hasData && mark !== null;
                  const showBadge = hasData && mark === "achieved";
                  const cellStyle = hasData
                    ? getWinCellColor(percentage)
                    : {
                        backgroundColor: "transparent",
                        color: showGlyph ? undefined : "transparent",
                      };
                  const isPeak =
                    hasData &&
                    percentage > 0 &&
                    percentage === peakProbabilityByTeam.get(team.team_id);

                  return (
                    <td
                      key={`${team.team_id}-${team.team_name}-wins-${wins}`}
                      className={styles.probabilityCell}
                    >
                      <div
                        data-screenshot-tile="true"
                        className={cn(
                          styles.heatTile,
                          isPeak && styles.peakTile,
                          !hasData && styles.emptyTile,
                          showGlyph && mark === "achieved" && styles.achievedTile,
                          showGlyph && mark === "impossible" && styles.impossibleTile,
                        )}
                        style={cellStyle}
                        title={
                          mark === "achieved"
                            ? hasData
                              ? `${team.team_name}: already has ${wins} conference wins; ${rounded}% chance of finishing there`
                              : `${team.team_name}: already has ${wins} conference wins`
                            : mark === "impossible"
                              ? `${team.team_name}: can no longer reach ${wins} conference wins`
                              : hasData
                                ? `${team.team_name}: ${rounded}% chance of ${wins} conference wins`
                                : `${team.team_name}: no data for ${wins} conference wins`
                        }
                      >
                        {hasData ? (
                          <>
                            {`${rounded}%`}
                            {showBadge && (
                              <span
                                className={styles.markBadge}
                                aria-hidden="true"
                              >
                                {"✓"}
                              </span>
                            )}
                          </>
                        ) : showGlyph ? (
                          <span aria-hidden="true">
                            {mark === "achieved" ? "✓" : "✕"}
                          </span>
                        ) : (
                          ""
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <th
                className={cn(styles.stickyColumn, styles.summaryLabel)}
                scope="row"
              >
                Curr Conf Record
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_id}-${team.team_name}-record`}
                  className={styles.summaryValue}
                >
                  <div className={styles.summaryChip}>
                    {regConfRecord(team).wins}-{regConfRecord(team).losses}
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export default memo(FootballWinsTable);
