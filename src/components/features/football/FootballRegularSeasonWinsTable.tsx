"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { cn } from "@/lib/utils";
import { FootballStanding } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";
import styles from "./FootballRegularSeasonWinsTable.module.css";

interface FootballRegularSeasonWinsTableProps {
  standings: FootballStanding[];
  className?: string;
  season?: string;
}

// Same blue hues and dispersion curve as the conference win-distribution
// table, so the two grids on this page read as one visual system.
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

// A soft hyphen only renders as a visible "-" when the browser itself
// breaks the line there; html2canvas (used for the download/print export)
// doesn't replicate that behavior and just drops it, so "Northwestern"
// silently loses its hyphen in exports. Using a real hyphen + zero-width
// space instead guarantees the same visible break on-screen and in exports.
function formatTeamName(name: string) {
  return name.replace(/\bNorthwestern\b/g, "North-" + String.fromCharCode(8203) + "western");
}

function FootballRegularSeasonWinsTable({
  standings,
  className,
  season,
}: FootballRegularSeasonWinsTableProps) {
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
          team.team_id,
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
      aria-labelledby="football-regular-season-win-distribution-title"
    >
      <div className={styles.cardHeader} data-screenshot-hide="true">
        <div className={styles.titleGroup}>
          <h2
            id="football-regular-season-win-distribution-title"
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
                Average
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_id}-${team.team_name}-average`}
                  className={styles.summaryValue}
                >
                  {(team.avg_reg_season_wins ?? 0).toFixed(1)}
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
                    ? getWinCellColor(percentage)
                    : { backgroundColor: "transparent", color: "transparent" };
                  const isPeak =
                    hasData &&
                    percentage > 0 &&
                    percentage === peakProbabilityByTeam.get(team.team_id);

                  return (
                    <td
                      key={`${team.team_id}-${team.team_name}-reg-wins-${wins}`}
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
                Est #12 Wins
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_id}-${team.team_name}-sag12`}
                  className={styles.summaryValue}
                >
                  {(team.avg_sag12_reg_season_wins ?? 0).toFixed(1)}
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
                  key={`${team.team_id}-${team.team_name}-twv`}
                  className={styles.summaryValue}
                >
                  {(team.reg_season_twv ?? 0).toFixed(1)}
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
                  key={`${team.team_id}-${team.team_name}-record`}
                  className={styles.summaryValue}
                >
                  {team.actual_total_wins ?? 0}-{team.actual_total_losses ?? 0}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export default memo(FootballRegularSeasonWinsTable);
