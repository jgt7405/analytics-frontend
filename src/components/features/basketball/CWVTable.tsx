"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { cn } from "@/lib/utils";
import { CWVData } from "@/types/basketball";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";
import styles from "./CWVTable.module.css";

interface GameData {
  rank: number;
  team: string;
  win_prob: number;
  date?: string;
  status?: string;
  opponent?: string;
  location?: string;
  opponent_logo?: string;
}

interface HoverState {
  rank: number;
  teamName: string;
  x: number;
  y: number;
}

interface CWVTableProps {
  cwvData: CWVData;
  className?: string;
  season?: string;
}

function CWVTable({ cwvData, className, season }: CWVTableProps) {
  const router = useRouter();
  const [hoveredGame, setHoveredGame] = useState<HoverState | null>(null);

  const navigateToTeam = useCallback(
    (teamName: string) => {
      const path = season
        ? `/basketball/${season}/team/${encodeURIComponent(teamName)}`
        : `/basketball/team/${encodeURIComponent(teamName)}`;
      router.push(path);
    },
    [router, season],
  );

  const sortedTeams = useMemo(() => {
    if (!cwvData?.teams) return [];
    return [...cwvData.teams].sort((a, b) => b.cwv - a.cwv);
  }, [cwvData?.teams]);

  // Calculate min/max CWV for color scaling
  const { minCWV, maxCWV } = useMemo(() => {
    const cwvValues = sortedTeams.map((team) => team.cwv);
    return {
      minCWV: Math.min(...cwvValues, -1),
      maxCWV: Math.max(...cwvValues, 1),
    };
  }, [sortedTeams]);

  // Color function for CWV values
  const getCWVColor = useCallback(
    (cwv: number) => {
      const blue = [24, 98, 123]; // Dark blue for positive values
      const white = [255, 255, 255]; // White baseline
      const yellow = [255, 230, 113]; // Yellow for negative values

      let r: number, g: number, b: number;

      if (cwv > 0) {
        const ratio = Math.min(Math.abs(cwv / maxCWV), 1);
        r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
        g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
        b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
      } else if (cwv < 0) {
        const ratio = Math.min(Math.abs(cwv / minCWV), 1);
        r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
        g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
        b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);
      } else {
        [r, g, b] = white;
      }

      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const textColor = brightness > 140 ? "#000000" : "#ffffff";

      return {
        backgroundColor: `rgb(${r}, ${g}, ${b})`,
        color: textColor,
      };
    },
    [maxCWV, minCWV],
  );

  const { ranks, gamesByRankAndTeam, winProbsByRank } = useMemo(() => {
    if (!cwvData?.games || cwvData.games.length === 0) {
      return { ranks: [], gamesByRankAndTeam: {}, winProbsByRank: {} };
    }

    const { games } = cwvData;
    const maxRank = Math.max(...games.map((g) => g.rank));
    const ranks = Array.from({ length: maxRank }, (_, i) => i + 1);

    const gamesByRankAndTeam: Record<number, Record<string, GameData>> = {};
    const winProbsByRank: Record<number, number> = {};

    for (const game of games) {
      if (!gamesByRankAndTeam[game.rank]) {
        gamesByRankAndTeam[game.rank] = {};
      }
      gamesByRankAndTeam[game.rank][game.team] = game;

      if (
        !winProbsByRank[game.rank] ||
        game.team === sortedTeams[0]?.team_name
      ) {
        winProbsByRank[game.rank] = game.win_prob;
      }
    }

    return { ranks, gamesByRankAndTeam, winProbsByRank };
  }, [cwvData, sortedTeams]);

  const formatDate = useCallback((dateStr: string | undefined): string => {
    if (!dateStr) return "";
    try {
      // Parse date in local timezone to avoid off-by-one errors
      if (dateStr.includes("-")) {
        // Format: "YYYY-MM-DD"
        const [, month, day] = dateStr.split("-").map(Number);
        return `${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}`;
      } else {
        // Already in MM/DD format
        return dateStr;
      }
    } catch {
      return dateStr;
    }
  }, []);

  const formatTeamRecord = useCallback((record: string) => {
    return record || "";
  }, []);

  const renderGameTile = useCallback(
    (rank: number, teamName: string) => {
      const game = gamesByRankAndTeam[rank]?.[teamName];
      if (!game) return null;

      let backgroundColor = "var(--bg-primary)";
      let textColor = "var(--text-primary)";
      let content = "";

      if (game.status === "W") {
        backgroundColor = "#18627b";
        textColor = "white";
        content = "W";
      } else if (game.status === "L") {
        backgroundColor = "#ffe671";
        textColor = "black";
        content = "L";
      } else if (game.date) {
        // Get today's date at midnight for proper comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find the next game for this specific team (today or later, without W or L)
        const teamGames = Object.values(gamesByRankAndTeam)
          .map((rankGames) => rankGames[teamName])
          .filter((g) => {
            if (!g || !g.date) return false;
            // Parse date string YYYY-MM-DD
            const gameDate = new Date(g.date + "T00:00:00");
            // Include games that are today or later, and don't have a W or L status
            return (
              gameDate >= today &&
              (!g.status || (g.status !== "W" && g.status !== "L"))
            );
          })
          .sort(
            (a, b) =>
              new Date(a.date! + "T00:00:00").getTime() -
              new Date(b.date! + "T00:00:00").getTime(),
          );

        const isNextGame =
          teamGames.length > 0 && teamGames[0].rank === game.rank;

        backgroundColor = isNextGame ? "#d6ebf2" : "#f0f0f0";
        content = formatDate(game.date);
        textColor = "#4b5563";
      }

      const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        setHoveredGame({
          rank,
          teamName,
          x: e.clientX,
          y: e.clientY,
        });
      };

      const handleMouseLeave = () => {
        setHoveredGame(null);
      };

      return (
        <div
          className={styles.gameTile}
          style={{ backgroundColor, color: textColor }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {content}
        </div>
      );
    },
    [gamesByRankAndTeam, formatDate],
  );

  if (!cwvData || !cwvData.teams || !cwvData.games) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No CWV data available
      </div>
    );
  }

  const shouldVirtualize = ranks.length > 100;
  const maxVisibleRows = shouldVirtualize ? 50 : ranks.length;
  const visibleRanks = ranks.slice(0, maxVisibleRows);

  return (
    <section
      className={cn(styles.card, "cwv-table", className)}
      aria-label="Conference win value by game"
    >
      <div
        className={styles.scrollViewport}
        role="region"
        aria-label="Conference win value by game. Scroll horizontally to see every team."
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                className={cn(styles.stickyRank, styles.rankHeader)}
                scope="col"
              >
                #
              </th>
              <th
                className={cn(styles.stickyWinProb, styles.winProbHeader)}
                scope="col"
              >
                Win Prob
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
                    <span className={styles.teamName}>{team.team_name}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRanks.map((rank) => (
              <tr key={rank}>
                <th
                  className={cn(styles.stickyRank, styles.rankLabel)}
                  scope="row"
                >
                  {rank}
                </th>
                <th
                  className={cn(styles.stickyWinProb, styles.winProbLabel)}
                  scope="row"
                >
                  {winProbsByRank[rank]
                    ? `${Math.round(winProbsByRank[rank])}%`
                    : ""}
                </th>
                {sortedTeams.map((team) => (
                  <td
                    key={`${team.team_name}-${rank}`}
                    className={styles.gameCell}
                    data-screenshot-tile="true"
                  >
                    {renderGameTile(rank, team.team_name)}
                  </td>
                ))}
              </tr>
            ))}

            <tr className={styles.summaryRow}>
              <th
                colSpan={2}
                className={cn(styles.stickyLabel, styles.summaryLabel)}
                scope="row"
              >
                Conf Win Value
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`cwv-${team.team_name}`}
                  className={styles.summaryValue}
                >
                  <div className={styles.cwvChip} style={getCWVColor(team.cwv)}>
                    {team.cwv > 0
                      ? `+${team.cwv.toFixed(1)}`
                      : team.cwv.toFixed(1)}
                  </div>
                </td>
              ))}
            </tr>

            <tr className={styles.summaryRow}>
              <th
                colSpan={2}
                className={cn(styles.stickyLabel, styles.summaryLabel)}
                scope="row"
              >
                Current Record
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`record-${team.team_name}`}
                  className={styles.summaryValue}
                >
                  <div className={styles.cwvChip}>
                    {formatTeamRecord(team.current_record)}
                  </div>
                </td>
              ))}
            </tr>

            <tr className={styles.summaryRow}>
              <th
                colSpan={2}
                className={cn(styles.stickyLabel, styles.summaryLabel)}
                scope="row"
              >
                Est Avg Team Record
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`est-record-${team.team_name}`}
                  className={styles.summaryValue}
                >
                  <div className={styles.cwvChip}>
                    {formatTeamRecord(team.est_avg_record)}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {hoveredGame &&
        (() => {
          const game =
            gamesByRankAndTeam[hoveredGame.rank]?.[hoveredGame.teamName];
          if (!game) return null;

          let tooltipContent = null;

          if (game.status === "W" || game.status === "L") {
            tooltipContent = (
              <div className="text-xs space-y-0.5">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-200 dark:border-gray-600">
                  {game.opponent_logo && (
                    <Image
                      src={game.opponent_logo}
                      alt={game.opponent || "opponent"}
                      width={20}
                      height={20}
                      className="w-5 h-5"
                    />
                  )}
                  <span className="font-medium">{game.opponent}</span>
                </div>
                {game.location && <div>{game.location}</div>}
                {game.date && (
                  <div className="text-gray-600 dark:text-gray-300">
                    {new Date(game.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </div>
                )}
                <div>{game.status === "W" ? "Win" : "Loss"}</div>
              </div>
            );
          } else if (game.date) {
            tooltipContent = (
              <div className="text-xs space-y-0.5">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-200 dark:border-gray-600">
                  {game.opponent_logo && (
                    <Image
                      src={game.opponent_logo}
                      alt={game.opponent || "opponent"}
                      width={20}
                      height={20}
                      className="w-5 h-5"
                    />
                  )}
                  <span className="font-medium">{game.opponent}</span>
                </div>
                {game.location && <div>{game.location}</div>}
                {game.date && (
                  <div className="text-gray-600 dark:text-gray-300">
                    {new Date(game.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </div>
                )}
                <div>Upcoming</div>
              </div>
            );
          }

          if (!tooltipContent) return null;

          // Position tooltip to the right, with fallback to left if needed
          const tooltipWidth = 180;
          const tooltipHeight = 120;
          const gap = 12;
          const verticalGapAbove = 5; // Closer when above
          const verticalGapBelow = 8; // A bit below when below

          let left = hoveredGame.x + gap;
          let top;

          // Check if this is one of the top 3 games (ranks 1-3)
          const isTopGame = hoveredGame.rank <= 3;

          // Position above or below cursor
          if (isTopGame) {
            // Below cursor: tooltip starts a bit below the cursor
            top = hoveredGame.y + verticalGapBelow;
          } else {
            // Above cursor: tooltip ends closer above the cursor
            top = hoveredGame.y - tooltipHeight - verticalGapAbove;
          }

          // If too close to right edge, position to left
          if (left + tooltipWidth > window.innerWidth - 10) {
            left = hoveredGame.x - tooltipWidth - gap;
          }

          // Keep within viewport vertically
          if (top < 10) {
            top = 10;
          } else if (top + tooltipHeight > window.innerHeight - 10) {
            top = window.innerHeight - tooltipHeight - 10;
          }

          return (
            <div
              className="fixed bg-white dark:bg-slate-900 border border-gray-300 dark:border-gray-600 rounded shadow-lg p-2 pointer-events-none z-50"
              style={{
                left: `${left}px`,
                top: `${top}px`,
                maxWidth: `${tooltipWidth}px`,
              }}
            >
              {tooltipContent}
            </div>
          );
        })()}
    </section>
  );
}

export default memo(CWVTable);
