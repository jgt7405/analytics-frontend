"use client";

import TeamLogo from "@/components/ui/TeamLogo";

interface FootballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  sagarin_rank?: number;
  opp_rnk?: number;
  team_win_prob?: number;
  sag12_win_prob?: number;
  team_points?: number;
  opp_points?: number;
}

interface FootballTeamScheduleChartProps {
  schedule: FootballTeamGame[];
  navigateToTeam: (teamName: string) => void;
}

export default function FootballTeamScheduleChart({
  schedule,
  navigateToTeam,
}: FootballTeamScheduleChartProps) {
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
    if (rank === 999) return "FCS";
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
      <table className="w-full text-xs text-gray-700 dark:text-gray-200">
        <thead>
          <tr className="border-b dark:border-slate-700">
            <th className="text-left p-2 font-bold">Date</th>
            <th className="text-left p-2 font-bold">Loc</th>
            <th className="text-left p-2 font-bold">Opp</th>
            <th className="text-center p-2 font-bold">Rank</th>
            <th className="text-center p-2 font-bold">Win %</th>
            <th className="text-center p-2 font-bold">#12 %</th>
            <th className="text-center p-2 font-bold">Score</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((game, index) => (
            <tr
              key={index}
              className={`border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
                game.status === "W"
                  ? "border-2 border-green-500 bg-green-50 dark:bg-green-950/40"
                  : game.status === "L"
                    ? "border-2 border-red-500 bg-red-50 dark:bg-red-950/40"
                    : "border-b"
              }`}
            >
              <td className="p-2 font-semibold">{formatDate(game.date)}</td>
              <td className="p-2">
                <span
                  className={`px-1 py-0.5 rounded text-xs font-semibold ${
                    game.location === "Home"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300"
                      : game.location === "Away"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300"
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
              <td className="text-center p-2 font-semibold tabular-nums">
                {formatRank(game.opp_rnk || game.sagarin_rank)}
              </td>
              <td className="text-center p-2 font-semibold tabular-nums">
                {formatProbability(game.team_win_prob)}
              </td>
              <td className="text-center p-2 font-semibold tabular-nums">
                {formatProbability(game.sag12_win_prob)}
              </td>
              <td className="text-center p-2">
                <span
                  className={`font-semibold tabular-nums ${
                    game.status === "W"
                      ? "text-green-600 dark:text-green-400"
                      : game.status === "L"
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-600 dark:text-gray-300"
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
