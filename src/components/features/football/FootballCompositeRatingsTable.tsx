"use client";

import { CompositeRatingTeam } from "@/types/football";

interface FootballCompositeRatingsTableProps {
  teams: CompositeRatingTeam[];
}

export default function FootballCompositeRatingsTable({
  teams,
}: FootballCompositeRatingsTableProps) {
  if (teams.length === 0) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-300 py-8 text-center">
        No composite ratings available for this date.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-300 dark:border-gray-600">
            <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-200">
              Rank
            </th>
            <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-200">
              Team
            </th>
            <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-200">
              Conference
            </th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-gray-200">
              Composite Rtg %
            </th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-gray-200">
              Z-Score
            </th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-gray-200">
              # Sources
            </th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr
              key={team.team_name}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{team.rank}</td>
              <td className="py-2 px-3 font-medium text-gray-800 dark:text-gray-100">
                {team.team_name}
              </td>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{team.conference}</td>
              <td className="py-2 px-3 text-right text-gray-800 dark:text-gray-100">
                {team.display_score.toFixed(1)}
              </td>
              <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300">
                {team.composite_rating.toFixed(3)}
              </td>
              <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300">
                {team.num_sources}/10
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
