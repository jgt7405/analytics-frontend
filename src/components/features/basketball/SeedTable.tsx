"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useRouter } from "next/navigation";
import { memo, useMemo } from "react";

interface SeedTeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  average_seed?: number;
  seed_distribution: Record<string, number>;
  tournament_bid_pct?: number;
  first_four_out: number;
  next_four_out: number;
}

interface SeedTableProps {
  seedData: SeedTeam[];
  className?: string;
}

function SeedTable({ seedData, className }: SeedTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = (teamName: string) => {
    router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
  };

  const sortedTeams = useMemo(() => {
    return [...seedData].sort((a, b) => {
      const aAvgSeed =
        a.average_seed !== null && a.average_seed !== undefined
          ? a.average_seed
          : 999;
      const bAvgSeed =
        b.average_seed !== null && b.average_seed !== undefined
          ? b.average_seed
          : 999;
      if (aAvgSeed !== bAvgSeed) return aAvgSeed - bAvgSeed;

      const aFFO =
        (a.seed_distribution && a.seed_distribution["First Four Out"]) || 0;
      const bFFO =
        (b.seed_distribution && b.seed_distribution["First Four Out"]) || 0;
      if (aFFO !== bFFO) return bFFO - aFFO;

      const aNFO =
        (a.seed_distribution && a.seed_distribution["Next Four Out"]) || 0;
      const bNFO =
        (b.seed_distribution && b.seed_distribution["Next Four Out"]) || 0;
      return bNFO - aNFO;
    });
  }, [seedData]);

  // Responsive dimensions
  const firstColWidth = isMobile ? 60 : 140;
  const avgSeedColWidth = isMobile ? 50 : 70;
  const seedColWidth = isMobile ? 25 : 35;
  const tourneyColWidth = isMobile ? 50 : 70;
  const outColWidth = isMobile ? 40 : 50;
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 40 : 48;

  const tableClassName = cn(
    tableStyles.tableContainer,
    "seed-table",
    className
  );

  // Generate seed columns 1-16
  const seedColumns = Array.from({ length: 16 }, (_, i) => i + 1);

  // Format tournament percentage
  const formatTournamentPct = (value?: number) => {
    if (value === null || value === undefined) return "-";
    if (value > 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return `${Math.round(value)}%`;
  };

  // Get yellow color for First/Next Four Out cells
  const getOutColor = (value: number) => {
    if (value === 0) return { backgroundColor: "white", color: "transparent" };
    const white = [255, 255, 255];
    const yellow = [255, 230, 113];

    const ratio = Math.min(value / 100, 1);
    const r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
    const g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
    const b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);

    return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: "black" };
  };

  if (!seedData || seedData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No seed data available
      </div>
    );
  }

  return (
    <div
      className={`${tableClassName} relative overflow-x-auto overflow-y-auto max-h-[80vh]`}
    >
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
            {/* Team Column */}
            <th
              className={`sticky left-0 z-30 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: firstColWidth,
                minWidth: firstColWidth,
                maxWidth: firstColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                left: 0,
                border: "1px solid #e5e7eb",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              Team
            </th>

            {/* Average Seed Column */}
            <th
              className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: avgSeedColWidth,
                minWidth: avgSeedColWidth,
                maxWidth: avgSeedColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                border: "1px solid #e5e7eb",
                borderLeft: "none",
                whiteSpace: "pre-line",
              }}
            >
              Wgtd Avg{"\n"}Seed
            </th>

            {/* Seed Columns 1-16 */}
            {seedColumns.map((seed) => (
              <th
                key={`seed-${seed}`}
                className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: seedColWidth,
                  minWidth: seedColWidth,
                  maxWidth: seedColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                }}
              >
                {seed}
              </th>
            ))}

            {/* Tournament % Column */}
            <th
              className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: tourneyColWidth,
                minWidth: tourneyColWidth,
                maxWidth: tourneyColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                border: "1px solid #e5e7eb",
                borderLeft: "none",
                whiteSpace: "pre-line",
              }}
            >
              In{"\n"}Tourney %
            </th>

            {/* First Four Out Column */}
            <th
              className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: outColWidth,
                minWidth: outColWidth,
                maxWidth: outColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                border: "1px solid #e5e7eb",
                borderLeft: "none",
                whiteSpace: "pre-line",
              }}
            >
              1st 4{"\n"}Out
            </th>

            {/* Next Four Out Column */}
            <th
              className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: outColWidth,
                minWidth: outColWidth,
                maxWidth: outColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                border: "1px solid #e5e7eb",
                borderLeft: "none",
                whiteSpace: "pre-line",
              }}
            >
              Nxt 4{"\n"}Out
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTeams.map((team, index) => (
            <tr key={`${team.team_name}-${index}`}>
              {/* Team Cell */}
              <td
                className={`sticky left-0 z-20 bg-white text-left px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: firstColWidth,
                  minWidth: firstColWidth,
                  maxWidth: firstColWidth,
                  height: cellHeight,
                  position: "sticky",
                  left: 0,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                <div className="flex items-center gap-2">
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
                    size={isMobile ? 20 : 22}
                    onClick={() => navigateToTeam(team.team_name)}
                  />
                  {!isMobile && (
                    <span className="truncate">{team.team_name}</span>
                  )}
                </div>
              </td>

              {/* Average Seed Cell */}
              <td
                className={`bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: avgSeedColWidth,
                  minWidth: avgSeedColWidth,
                  maxWidth: avgSeedColWidth,
                  height: cellHeight,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                }}
              >
                {team.average_seed ? team.average_seed.toFixed(1) : "-"}
              </td>

              {/* Seed Cells 1-16 */}
              {seedColumns.map((seedNum) => {
                const value =
                  team.seed_distribution &&
                  team.seed_distribution[seedNum.toString()]
                    ? team.seed_distribution[seedNum.toString()]
                    : 0;
                const colorStyle = getCellColor(value);

                return (
                  <td
                    key={`${team.team_name}-seed-${seedNum}`}
                    className="relative p-0"
                    style={{
                      height: cellHeight,
                      width: seedColWidth,
                      minWidth: seedColWidth,
                      maxWidth: seedColWidth,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      backgroundColor: colorStyle.backgroundColor,
                      color: colorStyle.color,
                    }}
                  >
                    <div
                      className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                    >
                      {value > 0 ? `${Math.round(value)}%` : ""}
                    </div>
                  </td>
                );
              })}

              {/* Tournament % Cell */}
              <td
                className="relative p-0"
                style={{
                  height: cellHeight,
                  width: tourneyColWidth,
                  minWidth: tourneyColWidth,
                  maxWidth: tourneyColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  ...getCellColor(team.tournament_bid_pct || 0),
                }}
              >
                <div
                  className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                >
                  {formatTournamentPct(team.tournament_bid_pct)}
                </div>
              </td>

              {/* First Four Out Cell */}
              <td
                className="relative p-0"
                style={{
                  height: cellHeight,
                  width: outColWidth,
                  minWidth: outColWidth,
                  maxWidth: outColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  ...getOutColor(
                    team.seed_distribution?.["First Four Out"] || 0
                  ),
                }}
              >
                <div
                  className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                >
                  {(team.seed_distribution?.["First Four Out"] || 0) > 0
                    ? `${Math.round(team.seed_distribution["First Four Out"])}%`
                    : ""}
                </div>
              </td>

              {/* Next Four Out Cell */}
              <td
                className="relative p-0"
                style={{
                  height: cellHeight,
                  width: outColWidth,
                  minWidth: outColWidth,
                  maxWidth: outColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  ...getOutColor(
                    team.seed_distribution?.["Next Four Out"] || 0
                  ),
                }}
              >
                <div
                  className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                >
                  {(team.seed_distribution?.["Next Four Out"] || 0) > 0
                    ? `${Math.round(team.seed_distribution["Next Four Out"])}%`
                    : ""}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(SeedTable);
