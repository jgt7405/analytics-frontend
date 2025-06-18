// src/components/features/football/CWVTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { FootballCWVData } from "@/types/football";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

interface GameData {
  rank: number;
  team: string;
  win_prob: number;
  date?: string;
  status?: string;
}

interface CWVTableProps {
  cwvData: FootballCWVData;
  className?: string;
}

function CWVTable({ cwvData, className }: CWVTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/football/team/${encodeURIComponent(teamName)}`);
    },
    [router]
  );

  if (!cwvData || !cwvData.teams || !cwvData.games) {
    return (
      <div className="p-4 text-center text-gray-500">No CWV data available</div>
    );
  }

  const { teams, games } = cwvData;

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => b.cwv - a.cwv);
  }, [teams]);

  const { ranks, gamesByRankAndTeam, winProbsByRank } = useMemo(() => {
    const maxRank =
      games.length > 0 ? Math.max(...games.map((g) => g.rank)) : 0;
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
  }, [games, sortedTeams]);

  const formatDate = useCallback((dateStr: string | undefined): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${month}/${day}`;
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
        backgroundColor = "#fff7d6";
        textColor = "black";
        content = "L";
      } else if (game.date) {
        const currentDate = new Date();

        // Find the next game for this specific team
        const teamGames = Object.values(gamesByRankAndTeam)
          .map((rankGames) => rankGames[teamName])
          .filter((g) => g && g.date && new Date(g.date) > currentDate)
          .sort(
            (a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime()
          );

        const isNextGame =
          teamGames.length > 0 && teamGames[0].rank === game.rank;

        backgroundColor = isNextGame ? "#add8e6" : "#f0f0f0";
        content = formatDate(game.date);
        textColor = "#4b5563";
      }

      return (
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            isMobile ? "text-xs" : "text-sm"
          }`}
          style={{ backgroundColor, color: textColor }}
        >
          {content}
        </div>
      );
    },
    [gamesByRankAndTeam, formatDate, isMobile]
  );

  const shouldVirtualize = ranks.length > 100;
  const maxVisibleRows = shouldVirtualize ? 50 : ranks.length;
  const visibleRanks = ranks.slice(0, maxVisibleRows);

  // EXACT basketball CWV dimensions
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
                    size={26} // EXACT basketball size
                    className="flex-shrink-0"
                  />
                  {/* NO team name text - logos only like basketball */}
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

          {/* EXACT basketball summary rows format */}
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
                className={`text-center font-medium ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  backgroundColor: "#f9fafb",
                }}
              >
                {team.cwv > 0 ? `+${team.cwv.toFixed(1)}` : team.cwv.toFixed(1)}
              </td>
            ))}
          </tr>
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
                className={`text-center font-medium ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  backgroundColor: "#f9fafb",
                }}
              >
                {formatTeamRecord(team.current_record)}
              </td>
            ))}
          </tr>
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
                className={`text-center font-medium ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  backgroundColor: "#f9fafb",
                }}
              >
                {team.est_avg_record}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Virtualization message if needed */}
      {shouldVirtualize && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Showing first {maxVisibleRows} of {ranks.length} games
        </div>
      )}
    </div>
  );
}

export default memo(CWVTable);
