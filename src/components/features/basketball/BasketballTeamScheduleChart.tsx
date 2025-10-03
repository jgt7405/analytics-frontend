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
              className={`hover:bg-gray-50 transition-colors ${
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
                {formatRank(game.opp_kp_rank || game.kenpom_rank)}
              </td>
              <td className="text-center p-2">
                {formatProbability(game.team_win_prob)}
              </td>
              <td className="text-center p-2">
                {formatProbability(game.kenpom_win_prob)}
              </td>
              <td className="text-center p-2">
                <span
                  className={`font-medium ${
                    game.status === "W"
                      ? "text-green-600"
                      : game.status === "L"
                        ? "text-red-600"
                        : "text-gray-600"
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
