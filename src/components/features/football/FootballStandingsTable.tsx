"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { cn } from "@/lib/utils";
import { FootballStanding } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, ReactNode, useCallback, useMemo } from "react";
import styles from "./FootballStandingsTable.module.css";

interface FootballStandingsTableProps {
  standings: FootballStanding[];
  className?: string;
  season?: string;
  /** Optional element (e.g. conference selector) rendered on the right of the title row. */
  headerRight?: ReactNode;
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

// A soft hyphen only renders as a visible "-" when the browser itself
// breaks the line there; html2canvas (used for the download/print export)
// doesn't replicate that behavior and just drops it, so "Northwestern"
// silently loses its hyphen in exports. Using a real hyphen + zero-width
// space instead guarantees the same visible break on-screen and in exports.
function formatTeamName(name: string) {
  return name.replace(/\bNorthwestern\b/g, "North-" + String.fromCharCode(8203) + "western");
}

// standings_distribution keys have shown up as both "3" and "3.0" from the
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

function FootballStandingsTable({
  standings,
  className,
  season,
  headerRight,
}: FootballStandingsTableProps) {
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
        (a, b) => (a.avg_standing ?? 999) - (b.avg_standing ?? 999),
      ),
    [standings],
  );

  const positions = useMemo(() => {
    let maxPosition = 0;
    for (const team of standings) {
      const keys = Object.keys(team.standings_distribution ?? {}).map(Number);
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
          Math.max(0, ...Object.values(team.standings_distribution ?? {})),
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
      aria-labelledby="football-standings-title"
    >
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 id="football-standings-title" className={styles.title}>
            Projected Conference Standings (Including Ties)
          </h2>
        </div>
        {headerRight && (
          <div data-screenshot-hide="true">{headerRight}</div>
        )}
      </div>

      <div
        className={styles.scrollViewport}
        role="region"
        aria-label="Projected conference standings distribution. Scroll horizontally to see every team."
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
            <tr className={styles.averageRow}>
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
                  {(team.avg_standing ?? 0).toFixed(1)}
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
                    team.standings_distribution,
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
                  {team.actual_conference_wins ?? 0}-
                  {team.actual_conference_losses ?? 0}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export default memo(FootballStandingsTable);
