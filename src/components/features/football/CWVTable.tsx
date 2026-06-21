"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { FootballCWVData } from "@/types/football";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";

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

function CWVTable({ cwvData, className, season }: CWVTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [hoveredGame, setHoveredGame] = useState<HoverState | null>(null);

  // ✅ ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const navigateToTeam = useCallback(
    (teamName: string) => {
      const path = season
        ? `/football/${season}/team/${encodeURIComponent(teamName)}`
        : `/football/team/${encodeURIComponent(teamName)}`;
      router.push(path);
    },
    [router, season]
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
    [maxCWV, minCWV]
  );

  const { ranks, gamesByRankAndTeam } = useMemo(() => {
    if (!cwvData?.games || cwvData.games.length === 0) {
      return { ranks: [], gamesByRankAndTeam: {} };
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
  }, [cwvData, sortedTeams]);

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

  const formatTeamRecord = useCallback((record: string) => {
    return record || "";
  }, []);

  const renderGameCell = useCallback(
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

          // Find all future games for this team (status is a date, not W/L)
          const currentDate = new Date();
          const teamGames = Object.values(gamesByRankAndTeam)
            .map((rankGames) => rankGames[teamName])
            .filter(
              (g) =>
                g &&
                g.status &&
                g.status !== "W" &&
                g.status !== "L" &&
                new Date(g.status) > currentDate
            )
            .sort(
              (a, b) =>
                new Date(a.status!).getTime() - new Date(b.status!).getTime()
            );

          const isNextGame =
            teamGames.length > 0 &&
            teamGames[0].rank === game.rank &&
            gameDate > currentDate;

          backgroundColor = isNextGame ? "#d6ebf2" : "#f0f0f0";
          textColor = "#4b5563";
        } catch (error) {
          // If date parsing fails, leave blank
          content = "";
        }
      }

      const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        setHoveredGame({ rank, teamName, x: e.clientX, y: e.clientY });
      };
      const handleMouseLeave = () => setHoveredGame(null);

      return (
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            isMobile ? "text-xs" : "text-sm"
          } cursor-default`}
          style={{ backgroundColor, color: textColor }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {content}
        </div>
      );
    },
    [gamesByRankAndTeam, formatDate, isMobile]
  );

  // ✅ NOW check for missing data AFTER all hooks
  if (!cwvData || !cwvData.teams || !cwvData.games) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">No CWV data available</div>
    );
  }

  const shouldVirtualize = ranks.length > 100;
  const maxVisibleRows = shouldVirtualize ? 50 : ranks.length;
  const visibleRanks = ranks.slice(0, maxVisibleRows);

  const firstColWidth = isMobile ? 32 : 40;
  const teamColWidth = isMobile ? 40 : 64;
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 40 : 48;
  const summaryRowHeight = isMobile ? 24 : 28;

  const tableClassName = cn(tableStyles.tableContainer, "cwv-table", className);

  return (
    <div className={`${tableClassName} relative overflow-x-auto`}>
      <table
        className="border-collapse border-spacing-0"
        style={{
          width: "max-content",
          borderCollapse: "separate",
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr>
            <th
              className={`sticky left-0 z-30 bg-gray-50 dark:bg-slate-800 text-center font-normal ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                maxWidth: firstColWidth,
                height: headerHeight,
                position: "sticky",
                left: 0,
                border: "1px solid var(--border-color)",
                borderRight: "1px solid var(--border-color)",
              }}
            >
              #
            </th>
            {sortedTeams.map((team) => (
              <th
                key={team.team_name}
                className="bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-center font-normal p-0 cursor-pointer"
                style={{
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  height: headerHeight,
                  border: "1px solid var(--border-color)",
                  borderLeft: "none",
                }}
                onClick={() => navigateToTeam(team.team_name)}
              >
                <div className="flex flex-col items-center justify-center h-full px-1">
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
                    size={26}
                    className="flex-shrink-0"
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRanks.map((rank) => (
            <tr key={rank}>
              <td
                className={`sticky left-0 z-20 bg-white dark:bg-slate-900 text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: firstColWidth,
                  minWidth: firstColWidth,
                  maxWidth: firstColWidth,
                  height: cellHeight,
                  position: "sticky",
                  left: 0,
                  border: "1px solid var(--border-color)",
                  borderTop: "none",
                  borderRight: "1px solid var(--border-color)",
                }}
              >
                {rank}
              </td>
              {sortedTeams.map((team) => (
                <td
                  key={`${team.team_name}-${rank}`}
                  className="relative p-0"
                  style={{
                    height: cellHeight,
                    width: teamColWidth,
                    minWidth: teamColWidth,
                    maxWidth: teamColWidth,
                    border: "1px solid var(--border-color)",
                    borderTop: "none",
                    borderLeft: "none",
                  }}
                >
                  {renderGameCell(rank, team.team_name)}
                </td>
              ))}
            </tr>
          ))}

          {/* Summary rows */}
          <tr className="bg-gray-50 dark:bg-slate-800">
            <td
              colSpan={1}
              className={`sticky left-0 z-20 bg-gray-50 dark:bg-slate-800 text-left font-normal px-1 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid var(--border-color)",
                borderTop: "none",
                borderRight: "1px solid var(--border-color)",
              }}
            >
              Conf Win Value
            </td>
            {sortedTeams.map((team) => (
              <td
                key={`cwv-${team.team_name}`}
                className={`text-center font-medium ${isMobile ? "text-xs" : "text-sm"} relative p-0`}
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid var(--border-color)",
                  borderTop: "none",
                  borderLeft: "none",
                }}
              >
                <div
                  className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"} font-medium`}
                  style={getCWVColor(team.cwv)}
                >
                  {team.cwv > 0
                    ? `+${team.cwv.toFixed(1)}`
                    : team.cwv.toFixed(1)}
                </div>
              </td>
            ))}
          </tr>

          <tr className="bg-gray-50 dark:bg-slate-800">
            <td
              colSpan={1}
              className={`sticky left-0 z-20 bg-gray-50 dark:bg-slate-800 text-left font-normal px-1 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid var(--border-color)",
                borderTop: "none",
                borderRight: "1px solid var(--border-color)",
              }}
            >
              Current Record
            </td>
            {sortedTeams.map((team) => (
              <td
                key={`record-${team.team_name}`}
                className={`bg-white dark:bg-slate-900 text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid var(--border-color)",
                  borderTop: "none",
                  borderLeft: "none",
                  padding: "2px",
                }}
              >
                {formatTeamRecord(team.current_record)}
              </td>
            ))}
          </tr>

          <tr className="bg-gray-50 dark:bg-slate-800">
            <td
              colSpan={1}
              className={`sticky left-0 z-20 bg-gray-50 dark:bg-slate-800 text-left font-normal px-1 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid var(--border-color)",
                borderTop: "none",
                borderRight: "1px solid var(--border-color)",
              }}
            >
              Est Avg Team Record
            </td>
            {sortedTeams.map((team) => (
              <td
                key={`est-record-${team.team_name}`}
                className={`bg-white dark:bg-slate-900 text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid var(--border-color)",
                  borderTop: "none",
                  borderLeft: "none",
                  padding: "2px",
                }}
              >
                {formatTeamRecord(team.est_avg_record)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      {/* Tooltip */}
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
    </div>
  );
}

export default memo(CWVTable);
