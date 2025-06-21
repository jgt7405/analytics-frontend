"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { CWVData } from "@/types/basketball";
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
  cwvData: CWVData;
  className?: string;
}

function CWVTable({ cwvData, className }: CWVTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  // ✅ ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
    },
    [router]
  );

  const sortedTeams = useMemo(() => {
    if (!cwvData?.teams) return [];
    return [...cwvData.teams].sort((a, b) => b.cwv - a.cwv);
  }, [cwvData?.teams]);

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
  }, [cwvData?.games, sortedTeams]);

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
        const gameDate = new Date(game.date);

        const isNextGame =
          gameDate > currentDate &&
          !Object.values(gamesByRankAndTeam).some(
            (teamGames) =>
              teamGames[teamName]?.date &&
              new Date(teamGames[teamName].date!) > currentDate &&
              new Date(teamGames[teamName].date!) < gameDate
          );

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

  // ✅ NOW check for missing data AFTER all hooks
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
              Win
              <br />
              Prob
            </th>
            {sortedTeams.map((team) => (
              <th
                key={team.team_name}
                className="bg-gray-50 text-center font-normal"
                style={{
                  height: headerHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                }}
              >
                <div
                  className="flex justify-center items-center h-full cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToTeam(team.team_name);
                  }}
                >
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
                    size={isMobile ? 24 : 28}
                    className="flex-shrink-0"
                    onClick={() => navigateToTeam(team.team_name)}
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRanks.map((rank) => (
            <tr key={`rank-${rank}`}>
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

          {/* Summary rows */}
          <tr className="bg-gray-50">
            <td
              colSpan={2}
              className={`sticky left-0 z-20 bg-gray-50 text-left font-normal px-1 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth + secondColWidth,
                minWidth: firstColWidth + secondColWidth,
                maxWidth: firstColWidth + secondColWidth,
                height: summaryRowHeight,
                position: "sticky",
                left: 0,
                border: "1px solid #e5e7eb",
                borderTop: "2px solid #4b5563",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              Conf Win Value
            </td>
            {sortedTeams.map((team) => (
              <td
                key={`${team.team_name}-cwv`}
                className="bg-gray-50 text-center"
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "2px solid #4b5563",
                  borderLeft: "none",
                  fontSize: isMobile ? "12px" : "14px",
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
                maxWidth: firstColWidth + secondColWidth,
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
                key={`${team.team_name}-record`}
                className="bg-gray-50 text-center"
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  fontSize: isMobile ? "12px" : "14px",
                }}
              >
                {team.current_record}
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
                maxWidth: firstColWidth + secondColWidth,
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
                key={`${team.team_name}-est-record`}
                className="bg-gray-50 text-center"
                style={{
                  height: summaryRowHeight,
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  fontSize: isMobile ? "12px" : "14px",
                }}
              >
                {formatTeamRecord(team.est_avg_record)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default memo(CWVTable);
