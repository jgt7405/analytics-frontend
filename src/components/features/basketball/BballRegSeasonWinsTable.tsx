"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { getCellColor } from "@/lib/color-utils";
import { formatTeamName } from "@/lib/formatTeamName";
import { cn } from "@/lib/utils";
import {
  classifyWinTotal,
  inferTotalGames,
} from "@/lib/winsReachability";
import { Standing } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";
import styles from "./BballRegSeasonWinsTable.module.css";

interface BballRegSeasonWinsTableProps {
  standings: Standing[];
  className?: string;
  season?: string;
}

// [wins, losses] for the regular season only. Falls back to overall_record
// for archived rows without reg_season_wins/losses (see regSeasonByTeam).
function regSeasonRecord(team: Standing): [number, number] {
  if (team.reg_season_wins != null && team.reg_season_losses != null) {
    return [team.reg_season_wins, team.reg_season_losses];
  }
  const [wins, losses] = (team.overall_record ?? "0-0")
    .split("-")
    .map((part) => Number.parseInt(part, 10) || 0);
  return [wins ?? 0, losses ?? 0];
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
        (a, b) => (b.reg_season_twv_50 ?? 0) - (a.reg_season_twv_50 ?? 0),
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

  // Regular-season record and season length per team, for the settled-total
  // marks (see lib/winsReachability). The record comes from reg_season_wins/
  // losses, which leave out conference and NCAA tournament games just as
  // reg_wins_distribution does. Archived seasons saved before those fields
  // existed only have overall_record, which counts tournament games too (the
  // 2025-26 archive has Arizona at 32-2 overall with the distribution settled
  // on 29) - so once a team's distribution collapses to a single total it has
  // already banked, that total IS its final regular-season win count and
  // everything above it is out of reach. A single total above the current
  // wins is not settled: it means the remaining games are near-certain (e.g.
  // one non-D1 game left).
  const regSeasonByTeam = useMemo(() => {
    const parsed = standings.map((team) => {
      const [wins, losses] = regSeasonRecord(team);
      const keys = Object.keys(team.reg_wins_distribution ?? {}).map(Number);
      const settledWins =
        keys.length === 1 && keys[0] <= wins ? keys[0] : null;
      return { team, wins, losses, settledWins };
    });

    const openTotalGames = inferTotalGames(
      parsed
        .filter(({ settledWins }) => settledWins === null)
        .map(({ team, losses }) => ({
          losses,
          distribution: team.reg_wins_distribution,
        })),
    );

    return new Map(
      parsed.map(({ team, wins, losses, settledWins }) => [
        team.team_name,
        settledWins === null
          ? { actualWins: wins, actualLosses: losses, totalGames: openTotalGames }
          : {
              actualWins: settledWins,
              actualLosses: losses,
              totalGames: settledWins + losses,
            },
      ]),
    );
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
                  const showsNumber = hasData && percentage > 0;
                  const record = regSeasonByTeam.get(team.team_name);
                  const outcome = record
                    ? classifyWinTotal(wins, record, record.totalGames)
                    : "open";
                  // A blank cell shows the glyph on its own. A cell that
                  // already carries a probability keeps the number and gets
                  // the check as a corner badge instead, so neither piece of
                  // information crowds the other out.
                  const mark = outcome === "open" ? null : outcome;
                  const showGlyph = !showsNumber && mark !== null;
                  const showBadge = showsNumber && mark === "achieved";
                  const cellStyle = showGlyph
                    ? { backgroundColor: "transparent" }
                    : hasData
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
                          (!hasData || showGlyph) && styles.emptyTile,
                          showGlyph && mark === "achieved" && styles.achievedTile,
                          showGlyph && mark === "impossible" && styles.impossibleTile,
                        )}
                        style={cellStyle}
                        title={
                          mark === "achieved"
                            ? showsNumber
                              ? `${team.team_name}: already has ${wins} regular season wins; ${rounded}% chance of finishing there`
                              : `${team.team_name}: already has ${wins} regular season wins`
                            : mark === "impossible"
                              ? `${team.team_name}: can no longer reach ${wins} regular season wins`
                              : hasData
                                ? `${team.team_name}: ${rounded}% chance of ${wins} regular season wins`
                                : `${team.team_name}: no data for ${wins} regular season wins`
                        }
                      >
                        {showsNumber ? (
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
                Est #30 Wins
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_name}-rk50`}
                  className={styles.summaryValue}
                >
                  <div className={styles.summaryChip}>
                    {(team.avg_rk50_reg_season_wins ?? 0).toFixed(1)}
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
                    {(team.reg_season_twv_50 ?? 0).toFixed(1)}
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
                    {team.reg_season_wins != null && team.reg_season_losses != null
                      ? `${team.reg_season_wins}-${team.reg_season_losses}`
                      : (team.overall_record ?? "0-0")}
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
