import TeamLogo from "@/components/ui/TeamLogo";
import { PlayoffTeam } from "@/types/football";

interface FootballCFPBracketTableProps {
  playoffTeams: PlayoffTeam[];
}

export default function FootballCFPBracketTable({
  playoffTeams,
}: FootballCFPBracketTableProps) {
  const getSeedBorderStyle = (index: number) => {
    // Dark separator after every 4th team (index 3, 7, 11)
    if ((index + 1) % 4 === 0 && index < playoffTeams.length - 1) {
      return "3px solid #1f2937"; // Dark separator
    }
    return "1px solid var(--border-color)";
  };

  const getCategoryBgColor = (bid_type: string) => {
    if (bid_type === "Conference Champion") {
      return "#dbeafe"; // light blue
    }
    return "#dcfce7"; // light green
  };

  const getCategoryTextColor = (bid_type: string) => {
    if (bid_type === "Conference Champion") {
      return "#1e40af"; // blue
    }
    return "#166534"; // green
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Seed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Conf
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Proj CFP Rtg
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200">
            {playoffTeams.map((team, index) => (
              <tr
                key={`${team.rank}-${team.team_name}`}
                style={{
                  borderBottom: getSeedBorderStyle(index),
                }}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {team.rank}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.team_name}
                      size={32}
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {team.team_name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {team.conf_logo_url ? (
                    <TeamLogo
                      logoUrl={team.conf_logo_url}
                      teamName={team.conference}
                      size={24}
                    />
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-300">
                      {team.conference}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    style={{
                      backgroundColor: getCategoryBgColor(team.bid_type),
                      color: getCategoryTextColor(team.bid_type),
                    }}
                  >
                    {team.bid_type === "Conference Champion"
                      ? "Auto Bid"
                      : "At Large"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {team.full_season_cfp_rating_avg
                    ? team.full_season_cfp_rating_avg.toFixed(2)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
