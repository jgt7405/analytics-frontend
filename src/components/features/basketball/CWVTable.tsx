"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { CWVData } from "@/types/basketball";
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
  cwvData: CWVData;
  className?: string;
}

function CWVTable({ cwvData, className }: CWVTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [hoveredGame, setHoveredGame] = useState<HoverState | null>(null);

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
    },
    [router],
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

  const renderGameCell = useCallback(
    (rank: number, teamName: string) => {
      const game = gamesByRankAndTeam[rank]?.[teamName];
      if (!game) return null;

      let backgroundColor = "white";
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
    [gamesByRankAndTeam, formatDate, isMobile],
  );

  if (!cwvData || !cwvData.teams || !cwvData.games) {
    return (
      <div className="p-4 text-center text-gray-500">No CWV data available</div>
    );
  }

  const shouldVirtualize = ranks.length > 100;
  const maxVisibleRows = shouldVirtualize ? 50 : ranks.length;
  const visibleRanks = ranks.slice(0, maxVisibleRows);

  const firstColWidth = isMobile ? 32 : 40;
  const secondColWidth = isMobile ? 50 : 70;
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
              className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                maxWidth: firstColWidth,
                height: headerHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              #
            </th>
            <th
              className={`sticky z-30 bg-gray-50 text-center font-normal ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: secondColWidth,
                minWidth: secondColWidth,
                maxWidth: secondColWidth,
                height: headerHeight,
                position: "sticky",
                left: firstColWidth,
                border: "1px solid #e5e7eb",
                borderLeft: "none",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              Win Prob
            </th>
            {sortedTeams.map((team) => (
              <th
                key={team.team_name}
                className="bg-gray-50 text-center font-normal p-0 cursor-pointer hover:bg-gray-100"
                style={{
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  height: headerHeight,
                  border: "1px solid #e5e7eb",
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
                className={`sticky left-0 z-20 bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: firstColWidth,
                  minWidth: firstColWidth,
                  maxWidth: firstColWidth,
                  height: cellHeight,
                  position: "sticky",
                  left: 0,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                {rank}
              </td>
              <td
                className={`sticky z-20 bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: secondColWidth,
                  minWidth: secondColWidth,
                  maxWidth: secondColWidth,
                  height: cellHeight,
                  position: "sticky",
                  left: firstColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                {winProbsByRank[rank]
                  ? `${Math.round(winProbsByRank[rank])}%`
                  : ""}
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
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderLeft: "none",
                  }}
                >
                  {renderGameCell(rank, team.team_name)}
                </td>
              ))}
            </tr>
          ))}

          {/* CWV row with color shading */}
          <tr className="bg-gray-50">
            <td
              colSpan={2}
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-1 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth + secondColWidth,
                minWidth: firstColWidth + secondColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderTop: "none",
                borderRight: "1px solid #e5e7eb",
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
                  border: "1px solid #e5e7eb",
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

          {/* Current Record row */}
          <tr className="bg-gray-50">
            <td
              colSpan={2}
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-1 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth + secondColWidth,
                minWidth: firstColWidth + secondColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderTop: "none",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              Current Record
            </td>
            {sortedTeams.map((team) => (
              <td
                key={`record-${team.team_name}`}
                className={`bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  padding: "2px",
                }}
              >
                {formatTeamRecord(team.current_record)}
              </td>
            ))}
          </tr>

          {/* Est Avg Team Record row */}
          <tr className="bg-gray-50">
            <td
              colSpan={2}
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-1 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth + secondColWidth,
                minWidth: firstColWidth + secondColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderTop: "none",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              Est Avg Team Record
            </td>
            {sortedTeams.map((team) => (
              <td
                key={`est-record-${team.team_name}`}
                className={`bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
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
          const game =
            gamesByRankAndTeam[hoveredGame.rank]?.[hoveredGame.teamName];
          if (!game) return null;

          let tooltipContent = null;

          if (game.status === "W" || game.status === "L") {
            tooltipContent = (
              <div className="text-xs space-y-0.5">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
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
                  <div className="text-gray-600">
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
                <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
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
                  <div className="text-gray-600">
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
              className="fixed bg-white border border-gray-300 rounded shadow-lg p-2 pointer-events-none z-50"
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
    </div>
  );
}

export default memo(CWVTable);
