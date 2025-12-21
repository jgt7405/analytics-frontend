"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { NCAATeam, useNCAAProjections } from "@/hooks/useNCAAProjections";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

interface NCAABracketTableProps {
  className?: string;
}

// Extend NCAATeam interface to include conf_logo_url
interface NCAATeamWithConfLogo extends NCAATeam {
  conf_logo_url?: string;
}

function NCAABracketTable({ className }: NCAABracketTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const { data, loading, error } = useNCAAProjections();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
    },
    [router]
  );

  // Combine all teams and sort appropriately
  const allTeams = useMemo(() => {
    if (!data) return [];

    const tournament = (data.tournament_teams as NCAATeamWithConfLogo[]) || [];
    const firstFourOut = (data.first_four_out as NCAATeamWithConfLogo[]) || [];
    const nextFourOut = (data.next_four_out as NCAATeamWithConfLogo[]) || [];

    // Sort tournament teams by seed then TWV
    const sortedTournament = [...tournament].sort((a, b) => {
      const seedA = a.seed ? parseInt(a.seed, 10) : 999;
      const seedB = b.seed ? parseInt(b.seed, 10) : 999;

      if (seedA !== seedB) {
        return seedA - seedB;
      }

      return b.post_conf_tourney_twv - a.post_conf_tourney_twv;
    });

    // Sort First 4 Out by TWV descending
    const sortedFirst4Out = [...firstFourOut]
      .map((team) => ({
        ...team,
        category: "First 4 Out",
        seed: "Out",
      }))
      .sort((a, b) => b.post_conf_tourney_twv - a.post_conf_tourney_twv);

    // Sort Next 4 Out by TWV descending
    const sortedNext4Out = [...nextFourOut]
      .map((team) => ({
        ...team,
        category: "Next 4 Out",
        seed: "Out",
      }))
      .sort((a, b) => b.post_conf_tourney_twv - a.post_conf_tourney_twv);

    // Return tournament, then First 4 Out, then Next 4 Out
    return [...sortedTournament, ...sortedFirst4Out, ...sortedNext4Out];
  }, [data]);

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading tournament data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Error loading data:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-gray-500">No data available</div>
    );
  }

  const tableClassName = cn(
    tableStyles.tableContainer,
    "ncaa-bracket-table",
    className
  );

  // Responsive dimensions - matches TWV table
  const seedColWidth = isMobile ? 50 : 60;
  const teamColWidth = isMobile ? 150 : 220;
  const confColWidth = isMobile ? 80 : 120;
  const categoryColWidth = isMobile ? 80 : 120;
  const twvColWidth = isMobile ? 70 : 80;
  const cellHeight = isMobile ? 32 : 36;
  const headerHeight = isMobile ? 40 : 48;

  // Helper function to get category badge color
  const getCategoryBgColor = (category: string | undefined) => {
    switch (category) {
      case "Auto Bid":
        return "#dcfce7"; // light green
      case "At Large":
        return "#dbeafe"; // light blue
      case "Last 4 In":
        return "#e9d5ff"; // light purple
      case "First 4 Out":
        return "#ffedd5"; // light orange
      case "Next 4 Out":
        return "#fee2e2"; // light red
      default:
        return "#f3f4f6"; // light gray
    }
  };

  const getCategoryTextColor = (category: string | undefined) => {
    switch (category) {
      case "Auto Bid":
        return "#166534"; // green
      case "At Large":
        return "#1e40af"; // blue
      case "Last 4 In":
        return "#6b21a8"; // purple
      case "First 4 Out":
        return "#b45309"; // orange
      case "Next 4 Out":
        return "#991b1b"; // red
      default:
        return "#374151"; // gray
    }
  };

  // Get border style for seed separator and out teams separator
  const getSeedBorderStyle = (
    _seed: string | undefined,
    isLastInGroup: boolean
  ) => {
    if (isLastInGroup) {
      return "3px solid #1f2937"; // Dark separator
    }
    return "1px solid #e5e7eb";
  };

  const renderTeamRow = (
    team: NCAATeamWithConfLogo,
    index: number,
    isLastInGroup: boolean
  ) => (
    <tr key={`${team.teamid}-${index}`}>
      {/* Seed Cell */}
      <td
        className={`sticky left-0 z-20 bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
        style={{
          width: seedColWidth,
          minWidth: seedColWidth,
          maxWidth: seedColWidth,
          height: cellHeight,
          position: "sticky",
          left: 0,
          border: "1px solid #e5e7eb",
          borderTop: "none",
          borderRight: "1px solid #e5e7eb",
          borderBottom: getSeedBorderStyle(team.seed, isLastInGroup),
        }}
      >
        {team.seed || "-"}
      </td>

      {/* Team Cell (with logo and name) */}
      <td
        className={`sticky z-20 bg-white text-left px-2 ${isMobile ? "text-xs" : "text-sm"}`}
        style={{
          width: teamColWidth,
          minWidth: teamColWidth,
          maxWidth: teamColWidth,
          height: cellHeight,
          position: "sticky",
          left: seedColWidth,
          border: "1px solid #e5e7eb",
          borderTop: "none",
          borderLeft: "none",
          borderRight: "2px solid #d1d5db",
          borderBottom: getSeedBorderStyle(team.seed, isLastInGroup),
        }}
      >
        <div className="flex items-center gap-2">
          <TeamLogo
            logoUrl={team.logo_url}
            teamName={team.team_name}
            size={isMobile ? 24 : 28}
            onClick={() => navigateToTeam(team.team_name)}
            className="flex-shrink-0"
          />
          <span className="truncate">{team.team_name}</span>
        </div>
      </td>

      {/* Conference Cell - with logo from backend */}
      <td
        className={`bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
        style={{
          width: confColWidth,
          minWidth: confColWidth,
          maxWidth: confColWidth,
          height: cellHeight,
          border: "1px solid #e5e7eb",
          borderTop: "none",
          borderLeft: "none",
          borderBottom: getSeedBorderStyle(team.seed, isLastInGroup),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {team.conf_logo_url ? (
          <TeamLogo
            logoUrl={team.conf_logo_url}
            teamName={team.full_conference_name}
            size={isMobile ? 20 : 24}
            className="flex-shrink-0"
          />
        ) : (
          <span className="text-xs text-gray-500">-</span>
        )}
      </td>

      {/* Category Cell */}
      <td
        className={`bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
        style={{
          width: categoryColWidth,
          minWidth: categoryColWidth,
          maxWidth: categoryColWidth,
          height: cellHeight,
          border: "1px solid #e5e7eb",
          borderTop: "none",
          borderLeft: "none",
          borderBottom: getSeedBorderStyle(team.seed, isLastInGroup),
          backgroundColor: getCategoryBgColor(team.category),
          color: getCategoryTextColor(team.category),
          fontWeight: "500",
        }}
      >
        {team.category}
      </td>

      {/* Proj TWV Cell */}
      <td
        className={`bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
        style={{
          width: twvColWidth,
          minWidth: twvColWidth,
          maxWidth: twvColWidth,
          height: cellHeight,
          border: "1px solid #e5e7eb",
          borderTop: "none",
          borderLeft: "none",
          borderBottom: getSeedBorderStyle(team.seed, isLastInGroup),
          fontWeight: "500",
        }}
      >
        {team.post_conf_tourney_twv.toFixed(2)}
      </td>
    </tr>
  );

  return (
    <div>
      {/* Single Combined Table */}
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
              {/* Seed Column */}
              <th
                className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: seedColWidth,
                  minWidth: seedColWidth,
                  maxWidth: seedColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  left: 0,
                  border: "1px solid #e5e7eb",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                Seed
              </th>

              {/* Team Column */}
              <th
                className={`sticky z-30 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  left: seedColWidth,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderRight: "2px solid #d1d5db",
                }}
              >
                Team
              </th>

              {/* Conference Column */}
              <th
                className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: confColWidth,
                  minWidth: confColWidth,
                  maxWidth: confColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                }}
              >
                Conf
              </th>

              {/* Category Column */}
              <th
                className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: categoryColWidth,
                  minWidth: categoryColWidth,
                  maxWidth: categoryColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                }}
              >
                Category
              </th>

              {/* Proj TWV Column */}
              <th
                className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: twvColWidth,
                  minWidth: twvColWidth,
                  maxWidth: twvColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                }}
              >
                Proj TWV
              </th>
            </tr>
          </thead>
          <tbody>
            {allTeams.map((team, idx) => {
              const nextTeam = allTeams[idx + 1];

              // Determine if this is the last row in a group
              let isLastInGroup = false;

              if (!nextTeam) {
                // Last row overall
                isLastInGroup = true;
              } else if (team.seed !== "Out" && nextTeam.seed === "Out") {
                // Last tournament team before out teams
                isLastInGroup = true;
              } else if (
                team.seed === "Out" &&
                nextTeam.seed === "Out" &&
                team.category !== nextTeam.category
              ) {
                // Last First 4 Out before Next 4 Out
                isLastInGroup = true;
              } else if (team.seed !== "Out" && team.seed !== "-") {
                // Within tournament seeds - dark line between seeds
                const currentSeed = parseInt(team.seed || "0", 10);
                const nextSeed =
                  nextTeam.seed !== "Out"
                    ? parseInt(nextTeam.seed || "0", 10)
                    : 999;
                if (currentSeed !== nextSeed) {
                  isLastInGroup = true;
                }
              }

              return renderTeamRow(team, idx, isLastInGroup);
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default NCAABracketTable;
