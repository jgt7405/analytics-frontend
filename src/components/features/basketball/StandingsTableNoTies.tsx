"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { formatTeamName } from "@/lib/formatTeamName";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import { Standing } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";
import styles from "./StandingsTableNoTies.module.css";

interface StandingsTableNoTiesProps {
  standings: Standing[];
  className?: string;
  season?: string;
}

// Standing_Dist_No_Ties keys have shown up as both "3" and "3.0" from the
// backend (same quirk documented on the football equivalent); check both
// forms before concluding a position has no data.
function readDistribution(
  distribution: Record<number, number> | undefined,
  position: number,
): { hasData: boolean; percentage: number } {
  const intKey = position.toString();
  const floatKey = `${position}.0`;
  const record = distribution as unknown as Record<string, number> | undefined;
  if (record && Object.prototype.hasOwnProperty.call(record, intKey)) {
    return { hasData: true, percentage: record[intKey] };
  }
  if (record && Object.prototype.hasOwnProperty.call(record, floatKey)) {
    return { hasData: true, percentage: record[floatKey] };
  }
  return { hasData: false, percentage: 0 };
}

function StandingsTableNoTies({
  standings,
  className,
  season,
}: StandingsTableNoTiesProps) {
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
      [...standings].sort((a, b) => {
        const aStanding = a.Conf_Standing_No_Ties_Avg ?? a.avg_standing ?? 999;
        const bStanding = b.Conf_Standing_No_Ties_Avg ?? b.avg_standing ?? 999;
        return aStanding - bStanding;
      }),
    [standings],
  );

  const positions = useMemo(() => {
    const maxPosition = Math.max(1, sortedTeams.length);
    return Array.from({ length: maxPosition }, (_, i) => i + 1);
  }, [sortedTeams.length]);

  const peakProbabilityByTeam = useMemo(
    () =>
      new Map(
        sortedTeams.map((team) => [
          team.team_name,
          Math.max(0, ...Object.values(team.Standing_Dist_No_Ties ?? {})),
        ]),
      ),
    [sortedTeams],
  );

  if (!standings || standings.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No standings data available
      </div>
    );
  }

  return (
    <section
      className={cn(styles.card, "standings-no-ties-table", className)}
      aria-label="Projected conference standings, ties broken"
    >
      <div
        className={styles.scrollViewport}
        role="region"
        aria-label="Projected conference standings distribution, ties broken. Scroll horizontally to see every team."
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={cn(styles.stickyColumn, styles.winsHeader)} scope="col">
                Position
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
            {positions.map((position) => (
              <tr key={`position-${position}`}>
                <th
                  className={cn(styles.stickyColumn, styles.winLabel)}
                  scope="row"
                >
                  {position}
                </th>
                {sortedTeams.map((team) => {
                  const { hasData, percentage } = readDistribution(
                    team.Standing_Dist_No_Ties,
                    position,
                  );
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
                      key={`${team.team_name}-position-${position}`}
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
                            ? `${team.team_name}: ${rounded}% chance of finishing position ${position}`
                            : `${team.team_name}: no data for position ${position}`
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
                Avg Position
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_name}-average`}
                  className={styles.summaryValue}
                >
                  <div className={styles.summaryChip}>
                    {(team.Conf_Standing_No_Ties_Avg ?? team.avg_standing)?.toFixed(
                      1,
                    ) ?? "-"}
                  </div>
                </td>
              ))}
            </tr>
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
                    {team.conference_record || "-"}
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

export default memo(StandingsTableNoTies);
