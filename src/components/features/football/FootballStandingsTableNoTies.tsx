"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { formatTeamName } from "@/lib/formatTeamName";
import { cn } from "@/lib/utils";
import { FootballStanding } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";
import styles from "./FootballStandingsTableNoTies.module.css";

interface FootballStandingsTableNoTiesProps {
  standings: FootballStanding[];
  className?: string;
  season?: string;
}

// Same blue hues and dispersion curve as the win-distribution tables, so
// every probability grid on the site reads as one visual system.
const CELL_MAX = 45;
const CELL_LIGHT = [195, 224, 236];
const CELL_DARK = [24, 98, 123];

function getCellColor(value: number): { backgroundColor: string; color: string } {
  const normalized = Math.min(Math.max(value, 0) / CELL_MAX, 1);
  const intensity = Math.pow(normalized, 0.6);

  const r = Math.round(CELL_LIGHT[0] + (CELL_DARK[0] - CELL_LIGHT[0]) * intensity);
  const g = Math.round(CELL_LIGHT[1] + (CELL_DARK[1] - CELL_LIGHT[1]) * intensity);
  const b = Math.round(CELL_LIGHT[2] + (CELL_DARK[2] - CELL_LIGHT[2]) * intensity);

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: intensity >= 0.45 ? "#ffffff" : "var(--wins-cell-text)",
  };
}

// standing_dist_no_ties keys have shown up as both "3" and "3.0" from the
// backend; check both forms before concluding a position has no data.
function readDistribution(
  distribution: Record<string, number> | undefined,
  position: number,
): { hasData: boolean; percentage: number } {
  const intKey = position.toString();
  const floatKey = `${position}.0`;
  if (distribution && Object.prototype.hasOwnProperty.call(distribution, intKey)) {
    return { hasData: true, percentage: distribution[intKey] };
  }
  if (distribution && Object.prototype.hasOwnProperty.call(distribution, floatKey)) {
    return { hasData: true, percentage: distribution[floatKey] };
  }
  return { hasData: false, percentage: 0 };
}

function FootballStandingsTableNoTies({
  standings,
  className,
  season,
}: FootballStandingsTableNoTiesProps) {
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
      [...standings].sort((a, b) => {
        const aStanding = a.conf_standing_no_ties_avg ?? a.avg_standing ?? 999;
        const bStanding = b.conf_standing_no_ties_avg ?? b.avg_standing ?? 999;
        return aStanding - bStanding;
      }),
    [standings],
  );

  const positions = useMemo(() => {
    let maxPosition = 0;
    for (const team of standings) {
      const keys = Object.keys(team.standing_dist_no_ties ?? {})
        .map(Number)
        .filter((pos) => Number.isFinite(pos) && pos > 0);
      if (keys.length > 0) {
        maxPosition = Math.max(maxPosition, ...keys);
      }
    }
    return Array.from({ length: Math.max(maxPosition, 1) }, (_, i) => i + 1);
  }, [standings]);

  const peakProbabilityByTeam = useMemo(
    () =>
      new Map(
        sortedTeams.map((team) => [
          team.team_id,
          Math.max(0, ...Object.values(team.standing_dist_no_ties ?? {})),
        ]),
      ),
    [sortedTeams],
  );

  if (!standings.length) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No standings data available
      </div>
    );
  }

  return (
    <section
      className={cn(styles.card, "standings-table", className)}
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
                Avg Position
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_id}-${team.team_name}-average`}
                  className={styles.summaryValue}
                >
                  <div className={styles.summaryChip}>
                    {(team.conf_standing_no_ties_avg ?? team.avg_standing ?? 0).toFixed(1)}
                  </div>
                </td>
              ))}
            </tr>
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
                    team.standing_dist_no_ties,
                    position,
                  );
                  const rounded = Math.round(percentage);
                  const cellStyle = hasData
                    ? getCellColor(percentage)
                    : { backgroundColor: "transparent", color: "transparent" };
                  const isPeak =
                    hasData &&
                    percentage > 0 &&
                    percentage === peakProbabilityByTeam.get(team.team_id);

                  return (
                    <td
                      key={`${team.team_id}-${team.team_name}-position-${position}`}
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
                        {hasData ? `${rounded}%` : ""}
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
                    {team.actual_conference_wins ?? 0}-
                    {team.actual_conference_losses ?? 0}
                    {(() => {
                      const wins = team.actual_conference_wins ?? 0;
                      const losses = team.actual_conference_losses ?? 0;
                      const games = wins + losses;
                      if (games === 0) return null;
                      const pct = team.actual_conference_win_pct ?? wins / games;
                      return ` (${pct.toFixed(3).replace(/^0/, "")})`;
                    })()}
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

export default memo(FootballStandingsTableNoTies);
