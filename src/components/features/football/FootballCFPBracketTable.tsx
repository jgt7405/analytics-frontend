import TeamLogo from "@/components/ui/TeamLogo";
import { PlayoffTeam } from "@/types/football";

interface FootballCFPBracketTableProps {
  playoffTeams: PlayoffTeam[];
}

interface SeedGroup {
  seed: number;
  teams: PlayoffTeam[];
}

export default function FootballCFPBracketTable({
  playoffTeams,
}: FootballCFPBracketTableProps) {
  // Group teams into seeds (1 seed = 2 teams, 2 seed = 2 teams, 3 seed = 4 teams, 4 seed = 4 teams)
  const seedGroups: SeedGroup[] = [
    { seed: 1, teams: playoffTeams.slice(0, 2) },
    { seed: 2, teams: playoffTeams.slice(2, 4) },
    { seed: 3, teams: playoffTeams.slice(4, 8) },
    { seed: 4, teams: playoffTeams.slice(8, 12) },
  ];

  const formatCFPPct = (value?: number): string => {
    if (value === undefined || value === null || value === 0) return "—";
    return `${(value * 100).toFixed(1)}%`;
  };

  // Flatten all teams with their seed assignment
  const allTeamsWithSeeds = seedGroups.flatMap((group) =>
    group.teams.map((team, idx) => ({
      seed: group.seed,
      isFirstInGroup: idx === 0,
      team,
    }))
  );

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
                CFP Bid %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200">
            {allTeamsWithSeeds.map((item, idx) => (
              <tr key={`${item.seed}-${item.team.rank}-${idx}`} className="hover:bg-gray-50 dark:bg-slate-800">
                <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                  {item.isFirstInGroup ? item.seed : ""}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <TeamLogo
                      logoUrl={item.team.logo_url}
                      teamName={item.team.team_name}
                      size={32}
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.team.team_name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {item.team.conference}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.team.bid_type === "Conference Champion"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {item.team.bid_type === "Conference Champion"
                      ? "Auto Bid"
                      : "At Large"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatCFPPct(item.team.cfp_bid_pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
