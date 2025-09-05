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
    if (!dateStr) return "TBD";

    // Handle MM/DD format
    if (dateStr.includes("/")) {
      const [month, day] = dateStr.split("/");
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);

      if (isNaN(monthNum) || isNaN(dayNum)) return "TBD";

      const date = new Date(2025, monthNum - 1, dayNum);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    // Handle other formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "TBD";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
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
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
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
              className={`border-b hover:bg-gray-50 transition-colors ${
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
                {formatRank(game.opp_rnk || game.sagarin_rank)}
              </td>
              <td className="text-center p-2">
                {formatProbability(game.team_win_prob)}
              </td>
              <td className="text-center p-2">
                {formatProbability(game.sag12_win_prob)}
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
