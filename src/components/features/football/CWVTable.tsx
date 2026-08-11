"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { cn } from "@/lib/utils";
import { FootballCWVData } from "@/types/football";
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
  cwvData: FootballCWVData;
  className?: string;
  season?: string;
}

// A soft hyphen only renders as a visible "-" when the browser itself
// breaks the line there; html2canvas (used for the download/print export)
// doesn't replicate that behavior and just drops it, so "Northwestern"
// silently loses its hyphen in exports. Using a real hyphen + zero-width
// space instead guarantees the same visible break on-screen and in exports.
function formatTeamName(name: string) {
  return name.replace(/\bNorthwestern\b/g, "North-" + String.fromCharCode(8203) + "western");
}

function CWVTable({ cwvData, className, season }: CWVTableProps) {
  const router = useRouter();
  const [hoveredGame, setHoveredGame] = useState<HoverState | null>(null);

  const navigateToTeam = useCallback(
    (teamName: string) => {
      const path = season
        ? `/football/${season}/team/${encodeURIComponent(teamName)}`
        : `/football/team/${encodeURIComponent(teamName)}`;
      router.push(path);
    },
    [router, season],
  );

  const sortedTeams = useMemo(() => {
    if (!cwvData?.teams) return [];
    return [...cwvData.teams].sort((a, b) => b.cwv - a.cwv);
  }, [cwvData?.teams]);

  // Color function for CWV values: blue for positive, yellow for negative,
  // scaled independently against this conference's min/max.
  const { minCWV, maxCWV } = useMemo(() => {
    const cwvValues = sortedTeams.map((team) => team.cwv);
    return {
      minCWV: Math.min(...cwvValues, -1),
      maxCWV: Math.max(...cwvValues, 1),
    };
  }, [sortedTeams]);

  const getCWVColor = useCallback(
    (cwv: number) => {
      const blue = [24, 98, 123];
      // Baseline matches cwvChip's own default fill (#e2e8f0) instead of
      // pure white - a cwv of 0 (or the min/max clamp collapsing to no
      // spread) then renders as the same neutral tile every other summary
      // row already uses, instead of disappearing into the white card
      // background with no visible border/fill at all.
      const neutral = [226, 232, 240];
      const yellow = [255, 230, 113];

      let r: number, g: number, b: number;

      if (cwv > 0) {
        const ratio = Math.min(Math.abs(cwv / maxCWV), 1);
        r = Math.round(neutral[0] + (blue[0] - neutral[0]) * ratio);
        g = Math.round(neutral[1] + (blue[1] - neutral[1]) * ratio);
        b = Math.round(neutral[2] + (blue[2] - neutral[2]) * ratio);
      } else if (cwv < 0) {
        const ratio = Math.min(Math.abs(cwv / minCWV), 1);
        r = Math.round(neutral[0] + (yellow[0] - neutral[0]) * ratio);
        g = Math.round(neutral[1] + (yellow[1] - neutral[1]) * ratio);
        b = Math.round(neutral[2] + (yellow[2] - neutral[2]) * ratio);
      } else {
        [r, g, b] = neutral;
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

  const { ranks, gamesByRankAndTeam } = useMemo(() => {
    if (!cwvData?.games || cwvData.games.length === 0) {
      return { ranks: [], gamesByRankAndTeam: {} as Record<number, Record<string, GameData>> };
    }

    const { games } = cwvData;
    const maxRank = Math.max(...games.map((g) => g.rank));
    const ranks = Array.from({ length: maxRank }, (_, i) => i + 1);

    const gamesByRankAndTeam: Record<number, Record<string, GameData>> = {};
    for (const game of games) {
      if (!gamesByRankAndTeam[game.rank]) {
        gamesByRankAndTeam[game.rank] = {};
      }
      gamesByRankAndTeam[game.rank][game.team] = game;
    }

    return { ranks, gamesByRankAndTeam };
  }, [cwvData]);

  const formatDate = useCallback((dateStr: string | undefined): string => {
    if (!dateStr) return "";
    // Parse YYYY-MM-DD directly without Date constructor to avoid UTC midnight shift
    // (new Date('YYYY-MM-DD') treats string as UTC, causing date to shift back 1 day in US timezones)
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[2]}/${isoMatch[3]}`;
    }
    return dateStr;
  }, []);

  const renderGameTile = useCallback(
    (rank: number, teamName: string) => {
      const game = gamesByRankAndTeam[rank]?.[teamName];
      if (!game) return null;

      let backgroundColor = "var(--bg-primary)";
      let textColor = "black";
      let content = "";

      if (game.status === "W") {
        backgroundColor = "#18627b";
        textColor = "white";
        content = "W";
      } else if (game.status === "L") {
        backgroundColor = "#ffe671";
        textColor = "black";
        content = "L";
      } else if (game.status && game.status !== "W" && game.status !== "L") {
        // Status contains a date string for future games
        try {
          const gameDate = new Date(game.status);
          content = formatDate(game.status);

          const currentDate = new Date();
          const teamGames = Object.values(gamesByRankAndTeam)
            .map((rankGames) => rankGames[teamName])
            .filter(
              (g) =>
                g &&
                g.status &&
                g.status !== "W" &&
                g.status !== "L" &&
                new Date(g.status) > currentDate,
            )
            .sort(
              (a, b) =>
                new Date(a.status!).getTime() - new Date(b.status!).getTime(),
            );

          const isNextGame =
            teamGames.length > 0 &&
            teamGames[0].rank === game.rank &&
            gameDate > currentDate;

          backgroundColor = isNextGame ? "#d6ebf2" : "#f0f0f0";
          textColor = "#4b5563";
        } catch {
          content = "";
        }
      }

      const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        setHoveredGame({ rank, teamName, x: e.clientX, y: e.clientY });
      };
      const handleMouseLeave = () => setHoveredGame(null);

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
              <th className={cn(styles.stickyColumn, styles.rankHeader)} scope="col">
                #
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

            {visibleRanks.map((rank) => (
              <tr key={rank}>
                <th
                  className={cn(styles.stickyColumn, styles.rankLabel)}
                  scope="row"
                >
                  {rank}
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
          </tbody>

          <tfoot>
            <tr>
              <th
                className={cn(styles.stickyColumn, styles.summaryLabel)}
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
                    {team.current_record || ""}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <th
                className={cn(styles.stickyColumn, styles.summaryLabel)}
                scope="row"
              >
                Est .500 Record
              </th>
              {sortedTeams.map((team) => (
                <td
                  key={`est-record-${team.team_name}`}
                  className={styles.summaryValue}
                >
                  <div className={styles.cwvChip}>
                    {team.est_avg_record || ""}
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {hoveredGame &&
        (() => {
          const game = gamesByRankAndTeam[hoveredGame.rank]?.[hoveredGame.teamName];
          if (!game) return null;

          let tooltipContent = null;
          const isResult = game.status === "W" || game.status === "L";
          const isFuture = !isResult && !!game.date;

          if (isResult || isFuture) {
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
                    {new Date(game.date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                )}
                <div>{isResult ? (game.status === "W" ? "Win" : "Loss") : "Upcoming"}</div>
                {game.win_prob != null && (
                  <div className="text-gray-600 dark:text-gray-300">
                    .500 record win prob: {Math.round(game.win_prob)}%
                  </div>
                )}
              </div>
            );
          }

          if (!tooltipContent) return null;

          const tooltipWidth = 200;
          const tooltipHeight = 130;
          const gap = 12;
          const isTopGame = hoveredGame.rank <= 3;

          let left = hoveredGame.x + gap;
          let top = isTopGame
            ? hoveredGame.y + 8
            : hoveredGame.y - tooltipHeight - 5;

          if (left + tooltipWidth > window.innerWidth - 10) {
            left = hoveredGame.x - tooltipWidth - gap;
          }
          if (top < 10) top = 10;
          else if (top + tooltipHeight > window.innerHeight - 10) {
            top = window.innerHeight - tooltipHeight - 10;
          }

          return (
            <div
              className="fixed bg-white dark:bg-slate-900 border border-gray-300 dark:border-gray-600 rounded shadow-lg p-2 pointer-events-none z-50"
              style={{ left: `${left}px`, top: `${top}px`, maxWidth: `${tooltipWidth}px` }}
            >
              {tooltipContent}
            </div>
          );
        })()}
    </section>
  );
}

export default memo(CWVTable);
