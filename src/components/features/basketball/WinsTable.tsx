"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { getCellColor } from "@/lib/color-utils";
import { formatTeamName } from "@/lib/formatTeamName";
import { cn } from "@/lib/utils";
import { Standing } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";
import styles from "./WinsTable.module.css";

interface WinsTableProps {
  standings: Standing[];
  className?: string;
  season?: string;
}

function WinsTable({ standings, className, season }: WinsTableProps) {
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
        (a, b) =>
          (b.avg_projected_conf_wins || 0) - (a.avg_projected_conf_wins || 0),
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

  // Basketball's win-distribution values are raw simulation counts (out of
  // total_scenarios), not pre-computed percentages like football's - convert
  // once per team so the peak lookup and per-cell render share one number.
  const percentagesByTeam = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const team of sortedTeams) {
      const distribution = team.conf_wins_distribution ?? {};
      const totalScenarios = team.total_scenarios || 1000;
      const percentages: Record<string, number> = {};
      for (const [winsKey, rawCount] of Object.entries(distribution)) {
        percentages[winsKey] = (rawCount / totalScenarios) * 100;
      }
      map.set(team.team_name, percentages);
    }
    return map;
  }, [sortedTeams]);

  const peakProbabilityByTeam = useMemo(
    () =>
      new Map(
        sortedTeams.map((team) => [
          team.team_name,
          Math.max(
            0,
            ...Object.values(percentagesByTeam.get(team.team_name) ?? {}),
          ),
        ]),
      ),
    [sortedTeams, percentagesByTeam],
  );

  if (!standings.length) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No wins data available
      </div>
    );
  }

  return (
    <section
      className={cn(styles.card, "wins-table", className)}
      aria-labelledby="basketball-win-distribution-title"
    >
      <div className={styles.cardHeader} data-screenshot-hide="true">
        <div className={styles.titleGroup}>
          <h2
            id="basketball-win-distribution-title"
            className={styles.title}
          >
            Projected Conference Win Distribution
          </h2>
        </div>
      </div>

      <div
        className={styles.scrollViewport}
        role="region"
        aria-label="Projected conference win distribution. Scroll horizontally to see every team."
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
                    {(team.avg_projected_conf_wins ?? 0).toFixed(1)}
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
                  const percentage =
                    percentagesByTeam.get(team.team_name)?.[winsKey] ?? 0;
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
                      key={`${team.team_name}-wins-${wins}`}
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
                            ? `${team.team_name}: ${rounded}% chance of ${wins} conference wins`
                            : `${team.team_name}: no data for ${wins} conference wins`
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
                Curr Conf Record
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_name}-record`}
                  className={styles.summaryValue}
                >
                  <div className={styles.summaryChip}>
                    {team.conference_wins ?? 0}-{team.conference_losses ?? 0}
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

export default memo(WinsTable);
