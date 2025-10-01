// src/components/features/basketball/BasketballTeamScheduleChart.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";

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

interface BasketballTeamScheduleChartProps {
  schedule: BasketballTeamGame[];
  navigateToTeam: (teamName: string) => void;
}

export default function BasketballTeamScheduleChart({
  schedule,
  navigateToTeam,
}: BasketballTeamScheduleChartProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) {
      return "TBD";
    }

    // Handle MM/DD format (this is what your backend sends)
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");

      if (parts.length !== 2) {
        return "TBD";
      }

      const [month, day] = parts;
      const m = parseInt(month, 10);
      const d = parseInt(day, 10);

      if (isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) {
        return "TBD";
      }

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

      const result = `${months[m - 1]} ${d}`;
      return result;
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

  const formatScore = (teamPts?: number, oppPts?: number, status?: string) => {
    if (
      status === "Scheduled" ||
      teamPts === null ||
      teamPts === undefined ||
      oppPts === null ||
      oppPts === undefined
    )
      return "";
    return `${oppPts}-${teamPts}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 font-bold">Date</th>
            <th className="text-left p-2 font-bold">Loc</th>
            <th className="text-left p-2 font-bold">Opp</th>
            <th className="text-center p-2 font-bold">KP Rank</th>
            <th className="text-center p-2 font-bold">Win %</th>
            <th className="text-center p-2 font-bold">KP %</th>
            <th className="text-center p-2 font-bold">Score</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((game, index) => (
            <tr
              key={index}
              className={`border-b hover:bg-gray-50 transition-colors ${
                game.status === "W"
                  ? "bg-green-50"
                  : game.status === "L"
                    ? "bg-red-50"
                    : ""
              }`}
            >
              <td className="p-2 text-left whitespace-nowrap">
                {formatDate(game.date)}
              </td>
              <td className="p-2 text-left">
                <span
                  className={`inline-block w-1 h-1 rounded-full mr-1 ${
                    game.location === "Home"
                      ? "bg-blue-500"
                      : game.location === "Away"
                        ? "bg-red-500"
                        : "bg-gray-500"
                  }`}
                />
                {game.location === "Home"
                  ? "vs"
                  : game.location === "Away"
                    ? "@"
                    : "N"}
              </td>
              <td
                className="p-2 text-left cursor-pointer hover:underline"
                onClick={() => navigateToTeam(game.opponent)}
              >
                <div className="flex items-center gap-2">
                  {game.opponent_logo && (
                    <TeamLogo
                      logoUrl={game.opponent_logo}
                      teamName={game.opponent}
                      size={20}
                    />
                  )}
                  <span className="truncate max-w-[150px]">
                    {game.opponent}
                  </span>
                </div>
              </td>
              <td className="p-2 text-center">
                {formatRank(game.opp_kp_rank || game.kenpom_rank)}
              </td>
              <td className="p-2 text-center font-medium">
                {formatProbability(game.team_win_prob)}
              </td>
              <td className="p-2 text-center">
                {formatProbability(game.kenpom_win_prob)}
              </td>
              <td className="p-2 text-center">
                <span
                  className={`font-medium ${
                    game.status === "W"
                      ? "text-green-600"
                      : game.status === "L"
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {formatScore(game.team_points, game.opp_points, game.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
