// src/components/features/football/FootballTeamsTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import Link from "next/link";

interface FootballTeam {
  team_name: string;
  team_id: string;
  conference: string;
  logo_url: string;
  overall_record: string;
  conference_record: string;
  cfp_bid_pct: number;
  average_seed?: number; // Add this field
}

interface FootballTeamsTableProps {
  teamsData: FootballTeam[];
  className?: string;
}

export default function FootballTeamsTable({
  teamsData,
  className,
}: FootballTeamsTableProps) {
  const { isMobile } = useResponsive();

  // DEBUG LOGGING
  console.log("🏈 FootballTeamsTable received data:", teamsData);
  console.log("🏈 First team in component:", teamsData?.[0]);
  console.log(
    "🏈 Alabama in component:",
    teamsData?.find((t) => t.team_name === "Alabama")
  );

  if (!teamsData?.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        No teams data available
      </div>
    );
  }

  const tableClassName = cn(
    tableStyles.tableContainer,
    "teams-table",
    className
  );

  return (
    <div className={`${tableClassName} relative overflow-x-auto`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 z-20 bg-gray-50 text-left p-2 border border-gray-300 min-w-48">
              Team
            </th>
            <th className="text-center p-2 border border-gray-300 min-w-32">
              Conference
            </th>
            <th className="text-center p-2 border border-gray-300 min-w-24">
              Overall
            </th>
            <th className="text-center p-2 border border-gray-300 min-w-24">
              Conference
            </th>
            <th className="text-center p-2 border border-gray-300 min-w-20">
              CFP %
            </th>
            <th className="text-center p-2 border border-gray-300 min-w-20">
              Avg Seed
            </th>
          </tr>
        </thead>
        <tbody>
          {teamsData.map((team) => (
            <tr key={team.team_id} className="hover:bg-gray-50">
              <td className="sticky left-0 z-10 bg-white p-2 border border-gray-300">
                <Link
                  href={`/football/team/${encodeURIComponent(team.team_name)}`}
                  className="flex items-center gap-2 hover:text-blue-600"
                >
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
                    size={isMobile ? 24 : 32}
                  />
                  <span
                    className={`font-medium ${
                      isMobile ? "text-sm" : "text-base"
                    }`}
                  >
                    {team.team_name}
                  </span>
                </Link>
              </td>
              <td className="text-center p-2 border border-gray-300">
                {team.conference}
              </td>
              <td className="text-center p-2 border border-gray-300">
                {team.overall_record}
              </td>
              <td className="text-center p-2 border border-gray-300">
                {team.conference_record}
              </td>
              <td className="text-center p-2 border border-gray-300 font-medium">
                {team.cfp_bid_pct.toFixed(1)}%
              </td>
              <td className="text-center p-2 border border-gray-300">
                {team.average_seed?.toFixed(1) || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
