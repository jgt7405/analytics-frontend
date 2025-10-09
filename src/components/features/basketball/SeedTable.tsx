// src/components/features/basketball/SeedTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useRouter } from "next/navigation";
import { memo, useMemo, useState } from "react";

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
  showAllTeams?: boolean;
}

type SortColumn =
  | "tournament_bid_pct"
  | "average_seed"
  | "first_four_out"
  | "next_four_out"
  | string; // For seed columns like "1", "2", etc.

function SeedTable({
  seedData,
  className,
  showAllTeams = false,
}: SeedTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [rowsToShow, setRowsToShow] = useState<number>(seedData.length);
  const [inputValue, setInputValue] = useState<string>(
    seedData.length.toString()
  );

  const navigateToTeam = (teamName: string) => {
    router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
  };

  // Generate seed columns 1-16
  const seedColumns = useMemo(
    () => Array.from({ length: 16 }, (_, i) => i + 1),
    []
  );

  const sortedTeams = useMemo(() => {
    const teams = [...seedData];

    if (sortColumn) {
      return teams.sort((a, b) => {
        let aVal: number;
        let bVal: number;

        // Handle different column types
        if (sortColumn === "tournament_bid_pct") {
          aVal = a.tournament_bid_pct || 0;
          bVal = b.tournament_bid_pct || 0;
          // Sort descending (highest first)
          if (aVal !== bVal) return bVal - aVal;
        } else if (sortColumn === "average_seed") {
          aVal =
            a.average_seed !== null &&
            a.average_seed !== undefined &&
            a.average_seed > 0
              ? a.average_seed
              : 999;
          bVal =
            b.average_seed !== null &&
            b.average_seed !== undefined &&
            b.average_seed > 0
              ? b.average_seed
              : 999;
          // Sort ascending (lowest first)
          if (aVal !== bVal) return aVal - bVal;
        } else if (sortColumn === "first_four_out") {
          aVal = a.seed_distribution?.["First Four Out"] || 0;
          bVal = b.seed_distribution?.["First Four Out"] || 0;
          // Sort descending (highest first)
          if (aVal !== bVal) return bVal - aVal;
        } else if (sortColumn === "next_four_out") {
          aVal = a.seed_distribution?.["Next Four Out"] || 0;
          bVal = b.seed_distribution?.["Next Four Out"] || 0;
          // Sort descending (highest first)
          if (aVal !== bVal) return bVal - aVal;
        } else {
          // Seed column (1-16)
          aVal = a.seed_distribution?.[sortColumn] || 0;
          bVal = b.seed_distribution?.[sortColumn] || 0;
          // Sort descending (highest first)
          if (aVal !== bVal) return bVal - aVal;
        }

        // Secondary tiebreakers
        // 1. Tournament bid %
        const aBidPct = a.tournament_bid_pct || 0;
        const bBidPct = b.tournament_bid_pct || 0;
        if (aBidPct !== bBidPct) return bBidPct - aBidPct;

        // 2. Average seed
        const aAvgSeed =
          a.average_seed !== null &&
          a.average_seed !== undefined &&
          a.average_seed > 0
            ? a.average_seed
            : 999;
        const bAvgSeed =
          b.average_seed !== null &&
          b.average_seed !== undefined &&
          b.average_seed > 0
            ? b.average_seed
            : 999;
        if (aAvgSeed !== bAvgSeed) return aAvgSeed - bAvgSeed;

        // 3. Alphabetical by team name
        return a.team_name.localeCompare(b.team_name);
      });
    }

    // Default sort (no column selected)
    return teams.sort((a, b) => {
      // 1. Sort by In Tourney % (descending - highest first)
      const aBidPct = a.tournament_bid_pct || 0;
      const bBidPct = b.tournament_bid_pct || 0;
      if (aBidPct !== bBidPct) return bBidPct - aBidPct;

      // 2. Sort by Wgtd Avg Seed (ascending - lowest first)
      const aAvgSeed =
        a.average_seed !== null &&
        a.average_seed !== undefined &&
        a.average_seed > 0
          ? a.average_seed
          : 999;
      const bAvgSeed =
        b.average_seed !== null &&
        b.average_seed !== undefined &&
        b.average_seed > 0
          ? b.average_seed
          : 999;
      if (aAvgSeed !== bAvgSeed) return aAvgSeed - bAvgSeed;

      // 3. Sort by 1st 4 Out (descending - highest first)
      const aFFO = a.seed_distribution?.["First Four Out"] || 0;
      const bFFO = b.seed_distribution?.["First Four Out"] || 0;
      if (aFFO !== bFFO) return bFFO - aFFO;

      // 4. Sort by Nxt 4 Out (descending - highest first)
      const aNFO = a.seed_distribution?.["Next Four Out"] || 0;
      const bNFO = b.seed_distribution?.["Next Four Out"] || 0;
      return bNFO - aNFO;
    });
  }, [seedData, sortColumn]);

  // Apply row limit filter
  const displayedTeams = useMemo(() => {
    if (showAllTeams) {
      return sortedTeams.slice(0, rowsToShow);
    }
    return sortedTeams;
  }, [sortedTeams, rowsToShow, showAllTeams]);

  const handleColumnClick = (column: SortColumn) => {
    setSortColumn(sortColumn === column ? null : column);
  };

  const handleRowsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0 && numValue <= seedData.length) {
      setRowsToShow(numValue);
    }
  };

  // Responsive dimensions
  const rankColWidth = isMobile ? 35 : 45;
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
    <div className="space-y-3">
      {/* Row filter - only show when All Teams is selected */}
      {showAllTeams && (
        <div className="flex items-center gap-3 px-2">
          <label
            className={`text-gray-700 font-medium ${isMobile ? "text-xs" : "text-sm"}`}
          >
            Show top:
          </label>
          <input
            type="number"
            min="1"
            max={seedData.length}
            value={inputValue}
            onChange={handleRowsInputChange}
            className={`border border-gray-300 rounded px-3 py-1 w-24 ${
              isMobile ? "text-xs" : "text-sm"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder={seedData.length.toString()}
          />
          <span className={`text-gray-600 ${isMobile ? "text-xs" : "text-sm"}`}>
            teams (of {seedData.length})
          </span>
        </div>
      )}

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
              {/* Rank Column */}
              <th
                className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${
                  isMobile ? "text-xs" : "text-sm"
                }`}
                style={{
                  width: rankColWidth,
                  minWidth: rankColWidth,
                  maxWidth: rankColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  left: 0,
                  border: "1px solid #e5e7eb",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                #
              </th>

              {/* Team Column */}
              <th
                className={`sticky z-30 bg-gray-50 text-left font-normal px-2 ${
                  isMobile ? "text-xs" : "text-sm"
                }`}
                style={{
                  width: firstColWidth,
                  minWidth: firstColWidth,
                  maxWidth: firstColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  left: rankColWidth,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                Team
              </th>

              {/* Average Seed Column */}
              <th
                className={`sticky bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  isMobile ? "text-xs" : "text-sm"
                } ${sortColumn === "average_seed" ? "bg-blue-100" : ""}`}
                onClick={() => handleColumnClick("average_seed")}
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
                title="Click to sort by average seed"
              >
                Wgtd Avg{"\n"}Seed
                {sortColumn === "average_seed" && (
                  <div className="text-blue-600 text-xs mt-1">▲</div>
                )}
              </th>

              {/* Seed Columns 1-16 */}
              {seedColumns.map((seed) => (
                <th
                  key={`seed-${seed}`}
                  className={`sticky bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                    isMobile ? "text-xs" : "text-sm"
                  } ${sortColumn === seed.toString() ? "bg-blue-100" : ""}`}
                  onClick={() => handleColumnClick(seed.toString())}
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
                  title={`Click to sort by seed ${seed}`}
                >
                  {seed}
                  {sortColumn === seed.toString() && (
                    <div className="text-blue-600 text-xs mt-1">▼</div>
                  )}
                </th>
              ))}

              {/* Tournament % Column */}
              <th
                className={`sticky bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  isMobile ? "text-xs" : "text-sm"
                } ${sortColumn === "tournament_bid_pct" ? "bg-blue-100" : ""}`}
                onClick={() => handleColumnClick("tournament_bid_pct")}
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
                title="Click to sort by tournament probability"
              >
                In{"\n"}Tourney %
                {sortColumn === "tournament_bid_pct" && (
                  <div className="text-blue-600 text-xs mt-1">▼</div>
                )}
              </th>

              {/* First Four Out Column */}
              <th
                className={`sticky bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  isMobile ? "text-xs" : "text-sm"
                } ${sortColumn === "first_four_out" ? "bg-blue-100" : ""}`}
                onClick={() => handleColumnClick("first_four_out")}
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
                title="Click to sort by First Four Out"
              >
                1st 4{"\n"}Out
                {sortColumn === "first_four_out" && (
                  <div className="text-blue-600 text-xs mt-1">▼</div>
                )}
              </th>

              {/* Next Four Out Column */}
              <th
                className={`sticky bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  isMobile ? "text-xs" : "text-sm"
                } ${sortColumn === "next_four_out" ? "bg-blue-100" : ""}`}
                onClick={() => handleColumnClick("next_four_out")}
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
                title="Click to sort by Next Four Out"
              >
                Nxt 4{"\n"}Out
                {sortColumn === "next_four_out" && (
                  <div className="text-blue-600 text-xs mt-1">▼</div>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedTeams.map((team, index) => (
              <tr key={`${team.team_name}-${index}`}>
                {/* Rank Cell */}
                <td
                  className={`sticky left-0 z-20 bg-white text-center ${
                    isMobile ? "text-xs" : "text-sm"
                  } font-medium`}
                  style={{
                    width: rankColWidth,
                    minWidth: rankColWidth,
                    maxWidth: rankColWidth,
                    height: cellHeight,
                    position: "sticky",
                    left: 0,
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderRight: "1px solid #e5e7eb",
                  }}
                >
                  {index + 1}
                </td>

                {/* Team Cell */}
                <td
                  className={`sticky z-20 bg-white text-left px-2 ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                  style={{
                    width: firstColWidth,
                    minWidth: firstColWidth,
                    maxWidth: firstColWidth,
                    height: cellHeight,
                    position: "sticky",
                    left: rankColWidth,
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderLeft: "none",
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
                    team.seed_distribution?.[seedNum.toString()] || 0;
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
                        className={`absolute inset-0 flex items-center justify-center ${
                          isMobile ? "text-xs" : "text-sm"
                        }`}
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
                    ...getCellColor(
                      team.tournament_bid_pct && team.tournament_bid_pct <= 1
                        ? team.tournament_bid_pct * 100
                        : team.tournament_bid_pct || 0
                    ),
                  }}
                >
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
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
                    className={`absolute inset-0 flex items-center justify-center ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
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
                    className={`absolute inset-0 flex items-center justify-center ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
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
    </div>
  );
}

export default memo(SeedTable);
