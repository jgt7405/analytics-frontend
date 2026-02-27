// src/components/features/basketball/BasketballTeamScheduleChart.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface BasketballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  kenpom_rank?: number;
  opp_kp_rank?: number;
  team_win_prob?: number;
  kenpom_win_prob?: number;
  team_points?: number;
  opp_points?: number;
}

interface UpcomingGameInfo {
  game_id: string;
  is_next_game_for_both: boolean;
  home_team: string;
  away_team: string;
  date_sort: string;
}

interface BasketballTeamScheduleChartProps {
  schedule: BasketballTeamGame[];
  navigateToTeam: (teamName: string) => void;
  teamName?: string;
}

export default function BasketballTeamScheduleChart({
  schedule,
  navigateToTeam,
  teamName,
}: BasketballTeamScheduleChartProps) {
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGameInfo[]>([]);

  // Fetch upcoming games data for preview links
  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const response = await fetch("/api/proxy/basketball/upcoming_games");
        if (!response.ok) return;
        const data = await response.json();
        setUpcomingGames(
          (data.games || []).map((g: Record<string, unknown>) => ({
            game_id: g.game_id as string,
            is_next_game_for_both: g.is_next_game_for_both as boolean,
            home_team: g.home_team as string,
            away_team: g.away_team as string,
            date_sort: g.date_sort as string,
          })),
        );
      } catch {
        // Silently fail - preview links just won't show
      }
    };
    fetchUpcoming();
  }, []);

  // Find the next unplayed game for this team
  const nextGameIndex = useMemo(() => {
    return schedule.findIndex((g) => g.status !== "W" && g.status !== "L");
  }, [schedule]);

  // Build a lookup for which game_id to use for the next game preview link
  const nextGamePreview = useMemo(() => {
    if (nextGameIndex < 0 || !teamName || upcomingGames.length === 0)
      return null;
    const nextGame = schedule[nextGameIndex];
    // Find matching upcoming game where this team is involved and it's next for both
    const match = upcomingGames.find(
      (ug) =>
        ug.is_next_game_for_both &&
        ((ug.home_team === teamName && ug.away_team === nextGame.opponent) ||
          (ug.away_team === teamName && ug.home_team === nextGame.opponent)),
    );
    return match || null;
  }, [nextGameIndex, schedule, teamName, upcomingGames]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "TBD";
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length !== 2) return "TBD";
      const [month, day] = parts;
      const m = parseInt(month, 10);
      const d = parseInt(day, 10);
      if (isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31)
        return "TBD";
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${months[m - 1]} ${d}`;
    }
    return "TBD";
  };

  const formatProbability = (prob?: number) => {
    if (!prob) return "-";
    return `${Math.round(prob * 100)}%`;
  };

  const formatRank = (rank?: number) => {
    if (!rank) return "-";
    if (rank === 999) return "N/A";
    return `#${rank}`;
  };

  const formatScore = (
    teamPts?: number,
    oppPts?: number,
    status?: string,
    oppKpRank?: number,
  ) => {
    if (
      status === "Scheduled" ||
      teamPts === null ||
      teamPts === undefined ||
      oppPts === null ||
      oppPts === undefined
    )
      return "";
    if (!oppKpRank || oppKpRank === 999) {
      return status === "W" ? "W" : status === "L" ? "L" : "";
    }
    return `${teamPts}-${oppPts}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 font-bold">Date</th>
            <th className="text-left p-2 font-bold">Loc</th>
            <th className="text-left p-2 font-bold">Opp</th>
            <th className="text-center p-2 font-bold">Rtg</th>
            <th className="text-center p-2 font-bold">Win %</th>
            <th className="text-center p-2 font-bold">#30 Win%</th>
            <th className="text-center p-2 font-bold">Score</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((game, index) => {
            const isNextGame = index === nextGameIndex;
            const scoreContent = formatScore(
              game.team_points,
              game.opp_points,
              game.status,
              game.opp_kp_rank || game.kenpom_rank,
            );

            return (
              <tr
                key={index}
                className={`${
                  game.status === "W"
                    ? "border-2 border-green-500 bg-green-50"
                    : game.status === "L"
                      ? "border-2 border-red-500 bg-red-50"
                      : "border-b"
                }`}
              >
                <td className="p-2">{formatDate(game.date)}</td>
                <td className="p-2">
                  <span
                    className={`px-1 py-0.5 rounded text-xs ${
                      game.location === "Home"
                        ? "bg-green-100 text-green-800"
                        : game.location === "Away"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {game.location}
                  </span>
                </td>
                <td className="p-2">
                  <div
                    className="flex items-center cursor-pointer hover:text-blue-600"
                    onClick={() => navigateToTeam(game.opponent)}
                  >
                    <TeamLogo
                      logoUrl={
                        game.opponent_logo || "/images/team_logos/default.png"
                      }
                      teamName={game.opponent}
                      size={20}
                    />
                  </div>
                </td>
                <td className="text-center p-2">
                  {!game.opp_kp_rank && !game.kenpom_rank
                    ? "Non D1"
                    : formatRank(game.opp_kp_rank || game.kenpom_rank)}
                </td>
                <td className="text-center p-2">
                  {formatProbability(game.team_win_prob)}
                </td>
                <td className="text-center p-2">
                  {formatProbability(game.kenpom_win_prob)}
                </td>
                <td className="text-center p-2">
                  {isNextGame && !scoreContent && nextGamePreview ? (
                    <Link
                      href={`/basketball/game-preview?game=${encodeURIComponent(nextGamePreview.game_id)}`}
                      className="text-[#0097b2] hover:text-[#007a91] font-medium underline"
                      style={{ fontSize: 11 }}
                    >
                      Preview
                    </Link>
                  ) : (
                    <span
                      className={`font-medium ${
                        game.status === "W"
                          ? "text-green-600"
                          : game.status === "L"
                            ? "text-red-600"
                            : "text-gray-600"
                      }`}
                    >
                      {scoreContent}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
