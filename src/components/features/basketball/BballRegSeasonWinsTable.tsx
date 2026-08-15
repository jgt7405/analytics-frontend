"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { getCellColor } from "@/lib/color-utils";
import { formatTeamName } from "@/lib/formatTeamName";
import { cn } from "@/lib/utils";
import { Standing } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";
import styles from "./BballRegSeasonWinsTable.module.css";

interface BballRegSeasonWinsTableProps {
  standings: Standing[];
  className?: string;
  season?: string;
}

function BballRegSeasonWinsTable({
  standings,
  className,
  season,
}: BballRegSeasonWinsTableProps) {
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      const path = season
        ? `/basketball/${season}/team/${encodeURIComponent(teamName)}`
        : `/basketball/team/${encodeURIComponent(teamName)}`;
      router.push(path);
    },
    [router, season],
  );

  const sortedTeams = useMemo(
    () =>
      [...standings].sort(
        (a, b) => (b.reg_season_twv ?? 0) - (a.reg_season_twv ?? 0),
      ),
    [standings],
  );

  const winColumns = useMemo(() => {
    let maxWins = 0;

    for (const team of standings) {
      const distributionWins = Object.keys(
        team.reg_wins_distribution ?? {},
      ).map(Number);
      if (distributionWins.length > 0) {
        maxWins = Math.max(maxWins, ...distributionWins);
      }
    }

    return Array.from({ length: maxWins + 1 }, (_, index) => maxWins - index);
  }, [standings]);

  const peakProbabilityByTeam = useMemo(
    () =>
      new Map(
        sortedTeams.map((team) => [
          team.team_name,
          Math.max(0, ...Object.values(team.reg_wins_distribution ?? {})),
        ]),
      ),
    [sortedTeams],
  );

  if (!standings.length) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No regular season wins data available
      </div>
    );
  }

  return (
    <section
      className={cn(styles.card, "wins-table", className)}
      aria-labelledby="basketball-regular-season-win-distribution-title"
    >
      <div className={styles.cardHeader} data-screenshot-hide="true">
        <div className={styles.titleGroup}>
          <h2
            id="basketball-regular-season-win-distribution-title"
            className={styles.title}
          >
            Projected Regular Season Win Distribution
          </h2>
        </div>
      </div>

      <div
        className={styles.scrollViewport}
        role="region"
        aria-label="Projected regular season win distribution. Scroll horizontally to see every team."
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={cn(styles.stickyColumn, styles.winsHeader)} scope="col">
                Reg Wins
              </th>
              {sortedTeams.map((team) => (
                <th
                  key={team.team_name}
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
                  key={`${team.team_name}-average`}
                  className={styles.summaryValue}
                >
                  <div className={styles.summaryChip}>
                    {(team.avg_reg_season_wins ?? 0).toFixed(1)}
                  </div>
                </td>
              ))}
            </tr>
            {winColumns.map((wins) => (
              <tr key={`reg-wins-${wins}`}>
                <th
                  className={cn(styles.stickyColumn, styles.winLabel)}
                  scope="row"
                >
                  {wins}
                </th>
                {sortedTeams.map((team) => {
                  const winsKey = wins.toString();
                  const distribution = team.reg_wins_distribution ?? {};
                  const hasData = Object.prototype.hasOwnProperty.call(
                    distribution,
                    winsKey,
                  );
                  const percentage = hasData ? distribution[winsKey] : 0;
                  const rounded = Math.round(percentage);
                  const cellStyle = hasData
                    ? getCellColor(percentage)
                    : { backgroundColor: "transparent", color: "transparent" };
                  const isPeak =
                    hasData &&
                    percentage > 0 &&
                    percentage === peakProbabilityByTeam.get(team.team_name);

                  return (
                    <td
                      key={`${team.team_name}-reg-wins-${wins}`}
                      className={styles.probabilityCell}
                    >
                      <div
                        data-screenshot-tile="true"
                        className={cn(
                          styles.heatTile,
                          isPeak && styles.peakTile,
                          !hasData && styles.emptyTile,
                        )}
                        style={cellStyle}
                        title={
                          hasData
                            ? `${team.team_name}: ${rounded}% chance of ${wins} regular season wins`
                            : `${team.team_name}: no data for ${wins} regular season wins`
                        }
                      >
                        {hasData && percentage > 0 ? `${rounded}%` : ""}
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
                Est #30 Wins
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_name}-kp40`}
                  className={styles.summaryValue}
                >
                  <div className={styles.summaryChip}>
                    {(team.avg_kp40_reg_season_wins ?? 0).toFixed(1)}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <th
                className={cn(styles.stickyColumn, styles.summaryLabel)}
                scope="row"
              >
                TWV
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_name}-twv`}
                  className={styles.summaryValue}
                >
                  <div className={styles.summaryChip}>
                    {(team.reg_season_twv ?? 0).toFixed(1)}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <th
                className={cn(styles.stickyColumn, styles.summaryLabel)}
                scope="row"
              >
                Curr Record
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_name}-record`}
                  className={styles.summaryValue}
                >
                  <div className={styles.summaryChip}>
                    {team.overall_record ?? "0-0"}
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

export default memo(BballRegSeasonWinsTable);
