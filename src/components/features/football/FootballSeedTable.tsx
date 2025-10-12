// src/components/features/football/FootballSeedTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";

interface FootballSeedTeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  average_seed?: number;
  seed_distribution: Record<string, number>;
  cfp_bid_pct?: number;
  first_four_out?: number;
  next_four_out?: number;
  conf_champ_overall_pct?: number;
  at_large_overall_pct?: number;
}

interface FootballSeedTableProps {
  seedData: FootballSeedTeam[];
  className?: string;
  showAllTeams?: boolean;
}

type SortColumn =
  | "avg_seed"
  | "cfp_pct"
  | "first_four_out"
  | "next_four_out"
  | "out_of_playoffs"
  | "conf_champ"
  | "at_large"
  | `seed_${number}`
  | null;

function FootballSeedTable({
  seedData,
  className,
  showAllTeams = false,
}: FootballSeedTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [rowsToShow, setRowsToShow] = useState<number>(seedData.length);
  const [inputValue, setInputValue] = useState<string>(
    seedData.length.toString()
  );

  // Reset to show all rows when switching to "All Teams"
  useEffect(() => {
    if (showAllTeams) {
      setRowsToShow(seedData.length);
      setInputValue(seedData.length.toString());
    }
  }, [showAllTeams, seedData.length]);

  const navigateToTeam = (teamName: string) => {
    router.push(`/football/team/${encodeURIComponent(teamName)}`);
  };

  const sortedTeams = useMemo(() => {
    const teams = [...seedData];

    if (sortColumn) {
      return teams.sort((a, b) => {
        let aVal = 0;
        let bVal = 0;

        // Handle different sort columns
        if (sortColumn === "avg_seed") {
          aVal = a.average_seed && a.average_seed > 0 ? a.average_seed : 999;
          bVal = b.average_seed && b.average_seed > 0 ? b.average_seed : 999;
          if (aVal !== bVal) return aVal - bVal; // Lower seed is better
        } else if (sortColumn === "cfp_pct") {
          aVal = a.cfp_bid_pct || 0;
          bVal = b.cfp_bid_pct || 0;
          if (aVal !== bVal) return bVal - aVal; // Higher % is better
        } else if (sortColumn === "first_four_out") {
          aVal = a.seed_distribution?.["First Four Out"] || 0;
          bVal = b.seed_distribution?.["First Four Out"] || 0;
          if (aVal !== bVal) return bVal - aVal; // Higher % is better
        } else if (sortColumn === "next_four_out") {
          aVal = a.seed_distribution?.["Next Four Out"] || 0;
          bVal = b.seed_distribution?.["Next Four Out"] || 0;
          if (aVal !== bVal) return bVal - aVal; // Higher % is better
        } else if (sortColumn === "out_of_playoffs") {
          aVal = 100 - (a.cfp_bid_pct || 0);
          bVal = 100 - (b.cfp_bid_pct || 0);
          if (aVal !== bVal) return bVal - aVal; // Higher % is better (more likely out)
        } else if (sortColumn === "conf_champ") {
          aVal = a.conf_champ_overall_pct || 0;
          bVal = b.conf_champ_overall_pct || 0;
          if (aVal !== bVal) return bVal - aVal; // Higher % is better
        } else if (sortColumn === "at_large") {
          aVal = a.at_large_overall_pct || 0;
          bVal = b.at_large_overall_pct || 0;
          if (aVal !== bVal) return bVal - aVal; // Higher % is better
        } else if (sortColumn.startsWith("seed_")) {
          const seedNum = sortColumn.replace("seed_", "");
          aVal = a.seed_distribution?.[seedNum] || 0;
          bVal = b.seed_distribution?.[seedNum] || 0;
          if (aVal !== bVal) return bVal - aVal; // Higher % is better
        }

        // Secondary sort: CFP %
        const aCFP = a.cfp_bid_pct || 0;
        const bCFP = b.cfp_bid_pct || 0;
        if (aCFP !== bCFP) return bCFP - aCFP;

        // Tertiary sort: Avg Seed
        const aAvgSeed =
          a.average_seed && a.average_seed > 0 ? a.average_seed : 999;
        const bAvgSeed =
          b.average_seed && b.average_seed > 0 ? b.average_seed : 999;
        if (aAvgSeed !== bAvgSeed) return aAvgSeed - bAvgSeed;

        // Final: Alphabetical
        return a.team_name.localeCompare(b.team_name);
      });
    }

    // Default sort (same as original)
    return teams.sort((a, b) => {
      const aCFP = a.cfp_bid_pct || 0;
      const bCFP = b.cfp_bid_pct || 0;
      if (aCFP !== bCFP) return bCFP - aCFP;

      const aAvgSeed =
        a.average_seed && a.average_seed > 0 ? a.average_seed : 999;
      const bAvgSeed =
        b.average_seed && b.average_seed > 0 ? b.average_seed : 999;
      if (aAvgSeed !== bAvgSeed) return aAvgSeed - bAvgSeed;

      const aFFO = a.seed_distribution?.["First Four Out"] || 0;
      const bFFO = b.seed_distribution?.["First Four Out"] || 0;
      if (aFFO !== bFFO) return bFFO - aFFO;

      const aNFO = a.seed_distribution?.["Next Four Out"] || 0;
      const bNFO = b.seed_distribution?.["Next Four Out"] || 0;
      if (aNFO !== bNFO) return bNFO - aNFO;

      return a.team_name.localeCompare(b.team_name);
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
  const statusColWidth = isMobile ? 45 : 60;
  const bidColWidth = isMobile ? 40 : 50;
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 40 : 48;

  const tableClassName = cn(
    tableStyles.tableContainer,
    "seed-table",
    className
  );

  // Generate seed columns 1-12 (CFP has 12 teams)
  const seedColumns = Array.from({ length: 12 }, (_, i) => i + 1);

  // Format CFP percentage
  const formatCFPPct = (value?: number) => {
    if (value === null || value === undefined) return "-";
    if (value > 0 && value < 0.5) return "<1%";
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

  const getCompactHeader = (label: string) => {
    if (label === "In Playoffs %") return "In\nPlayoffs %";
    if (label === "First Four Out") return "First\nFour Out";
    if (label === "Next Four Out") return "Next\nFour Out";
    if (label === "Out of Playoffs") return "Out of\nPlayoffs";
    if (label === "Conference Champion") return "Conf\nChamp";
    if (label === "At Large") return "At\nLarge";
    return label;
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
            {/* First header row - group headers */}
            <tr>
              {/* Rank Column */}
              <th
                rowSpan={2}
                className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${isMobile ? "text-xs" : "text-sm"}`}
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
                rowSpan={2}
                className={`sticky z-30 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
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

              {/* Seed Group Header */}
              <th
                colSpan={seedColumns.length + 1}
                className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  position: "sticky",
                  top: 0,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                }}
              >
                Seed
              </th>

              {/* CFP Status Group Header */}
              <th
                colSpan={4}
                className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  position: "sticky",
                  top: 0,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                }}
              >
                CFP Status
              </th>

              {/* Bid Category Group Header */}
              <th
                colSpan={2}
                className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  position: "sticky",
                  top: 0,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                }}
              >
                Bid Category
              </th>
            </tr>

            {/* Second header row - individual column headers */}
            <tr>
              {/* Average Seed Column - Clickable */}
              <th
                className={`bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  sortColumn === "avg_seed" ? "bg-blue-100" : ""
                } ${isMobile ? "text-xs" : "text-sm"}`}
                onClick={() => handleColumnClick("avg_seed")}
                style={{
                  width: avgSeedColWidth,
                  minWidth: avgSeedColWidth,
                  maxWidth: avgSeedColWidth,
                  height: headerHeight,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  whiteSpace: "pre-line",
                }}
                title="Click to sort by average seed"
              >
                Avg
                {sortColumn === "avg_seed" && (
                  <div className="text-blue-600 text-xs mt-1">▼</div>
                )}
              </th>

              {/* Seed Columns 1-12 - Clickable */}
              {seedColumns.map((seed) => (
                <th
                  key={`seed-${seed}`}
                  className={`bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                    sortColumn === `seed_${seed}` ? "bg-blue-100" : ""
                  } ${isMobile ? "text-xs" : "text-sm"}`}
                  onClick={() =>
                    handleColumnClick(`seed_${seed}` as SortColumn)
                  }
                  style={{
                    width: seedColWidth,
                    minWidth: seedColWidth,
                    maxWidth: seedColWidth,
                    height: headerHeight,
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderLeft: "none",
                  }}
                  title={`Click to sort by seed ${seed}`}
                >
                  {seed}
                  {sortColumn === `seed_${seed}` && (
                    <div className="text-blue-600 text-xs mt-1">▼</div>
                  )}
                </th>
              ))}

              {/* In CFP % Column - Clickable */}
              <th
                className={`bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  sortColumn === "cfp_pct" ? "bg-blue-100" : ""
                } ${isMobile ? "text-xs" : "text-sm"}`}
                onClick={() => handleColumnClick("cfp_pct")}
                style={{
                  width: statusColWidth,
                  minWidth: statusColWidth,
                  maxWidth: statusColWidth,
                  height: headerHeight,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  whiteSpace: "pre-line",
                  fontSize: isMobile ? "10px" : "11px",
                  lineHeight: "1.1",
                }}
                title="Click to sort by In Playoffs %"
              >
                {getCompactHeader("In Playoffs %")}
                {sortColumn === "cfp_pct" && (
                  <div className="text-blue-600 text-xs mt-1">▼</div>
                )}
              </th>

              {/* First Four Out Column - Clickable */}
              <th
                className={`bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  sortColumn === "first_four_out" ? "bg-blue-100" : ""
                } ${isMobile ? "text-xs" : "text-sm"}`}
                onClick={() => handleColumnClick("first_four_out")}
                style={{
                  width: statusColWidth,
                  minWidth: statusColWidth,
                  maxWidth: statusColWidth,
                  height: headerHeight,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  whiteSpace: "pre-line",
                  fontSize: isMobile ? "10px" : "11px",
                  lineHeight: "1.1",
                }}
                title="Click to sort by First Four Out"
              >
                {getCompactHeader("First Four Out")}
                {sortColumn === "first_four_out" && (
                  <div className="text-blue-600 text-xs mt-1">▼</div>
                )}
              </th>

              {/* Next Four Out Column - Clickable */}
              <th
                className={`bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  sortColumn === "next_four_out" ? "bg-blue-100" : ""
                } ${isMobile ? "text-xs" : "text-sm"}`}
                onClick={() => handleColumnClick("next_four_out")}
                style={{
                  width: statusColWidth,
                  minWidth: statusColWidth,
                  maxWidth: statusColWidth,
                  height: headerHeight,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  whiteSpace: "pre-line",
                  fontSize: isMobile ? "10px" : "11px",
                  lineHeight: "1.1",
                }}
                title="Click to sort by Next Four Out"
              >
                {getCompactHeader("Next Four Out")}
                {sortColumn === "next_four_out" && (
                  <div className="text-blue-600 text-xs mt-1">▼</div>
                )}
              </th>

              {/* Out of Playoffs Column - Clickable */}
              <th
                className={`bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  sortColumn === "out_of_playoffs" ? "bg-blue-100" : ""
                } ${isMobile ? "text-xs" : "text-sm"}`}
                onClick={() => handleColumnClick("out_of_playoffs")}
                style={{
                  width: statusColWidth,
                  minWidth: statusColWidth,
                  maxWidth: statusColWidth,
                  height: headerHeight,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  whiteSpace: "pre-line",
                  fontSize: isMobile ? "10px" : "11px",
                  lineHeight: "1.1",
                }}
                title="Click to sort by Out of Playoffs"
              >
                {getCompactHeader("Out of Playoffs")}
                {sortColumn === "out_of_playoffs" && (
                  <div className="text-blue-600 text-xs mt-1">▼</div>
                )}
              </th>

              {/* Conference Champion Column - Clickable */}
              <th
                className={`bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  sortColumn === "conf_champ" ? "bg-blue-100" : ""
                } ${isMobile ? "text-xs" : "text-sm"}`}
                onClick={() => handleColumnClick("conf_champ")}
                style={{
                  width: bidColWidth,
                  minWidth: bidColWidth,
                  maxWidth: bidColWidth,
                  height: headerHeight,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  whiteSpace: "pre-line",
                  fontSize: isMobile ? "10px" : "11px",
                  lineHeight: "1.1",
                }}
                title="Click to sort by Conference Champion"
              >
                {getCompactHeader("Conference Champion")}
                {sortColumn === "conf_champ" && (
                  <div className="text-blue-600 text-xs mt-1">▼</div>
                )}
              </th>

              {/* At Large Column - Clickable */}
              <th
                className={`bg-gray-50 text-center font-normal z-20 cursor-pointer hover:bg-gray-100 transition-colors ${
                  sortColumn === "at_large" ? "bg-blue-100" : ""
                } ${isMobile ? "text-xs" : "text-sm"}`}
                onClick={() => handleColumnClick("at_large")}
                style={{
                  width: bidColWidth,
                  minWidth: bidColWidth,
                  maxWidth: bidColWidth,
                  height: headerHeight,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  whiteSpace: "pre-line",
                  fontSize: isMobile ? "10px" : "11px",
                  lineHeight: "1.1",
                }}
                title="Click to sort by At Large"
              >
                {getCompactHeader("At Large")}
                {sortColumn === "at_large" && (
                  <div className="text-blue-600 text-xs mt-1">▼</div>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedTeams.map((team, index) => {
              const outOfPlayoffsPct = 100 - (team.cfp_bid_pct || 0);

              return (
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
                    className={`sticky z-20 bg-white text-left px-2 ${isMobile ? "text-xs" : "text-sm"}`}
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

                  {/* Seed Cells 1-12 */}
                  {seedColumns.map((seedNum) => {
                    const value =
                      team.seed_distribution &&
                      team.seed_distribution[seedNum.toString()]
                        ? team.seed_distribution[seedNum.toString()]
                        : 0;

                    const cellColorStyle = getCellColor(value);

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
                          ...cellColorStyle,
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

                  {/* In CFP % Cell with blue coloring */}
                  <td
                    className="relative p-0"
                    style={{
                      height: cellHeight,
                      width: statusColWidth,
                      minWidth: statusColWidth,
                      maxWidth: statusColWidth,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      ...getCellColor(team.cfp_bid_pct || 0),
                    }}
                  >
                    <div
                      className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                    >
                      {formatCFPPct(team.cfp_bid_pct)}
                    </div>
                  </td>

                  {/* First Four Out Cell */}
                  <td
                    className="relative p-0"
                    style={{
                      height: cellHeight,
                      width: statusColWidth,
                      minWidth: statusColWidth,
                      maxWidth: statusColWidth,
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
                      width: statusColWidth,
                      minWidth: statusColWidth,
                      maxWidth: statusColWidth,
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

                  {/* Out of Playoffs Cell */}
                  <td
                    className="relative p-0"
                    style={{
                      height: cellHeight,
                      width: statusColWidth,
                      minWidth: statusColWidth,
                      maxWidth: statusColWidth,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      ...getOutColor(outOfPlayoffsPct),
                    }}
                  >
                    <div
                      className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                    >
                      {outOfPlayoffsPct > 0
                        ? `${Math.round(outOfPlayoffsPct)}%`
                        : ""}
                    </div>
                  </td>

                  {/* Conference Champion Cell */}
                  <td
                    className="relative p-0"
                    style={{
                      height: cellHeight,
                      width: bidColWidth,
                      minWidth: bidColWidth,
                      maxWidth: bidColWidth,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      ...getCellColor(team.conf_champ_overall_pct || 0),
                    }}
                  >
                    <div
                      className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                    >
                      {(team.conf_champ_overall_pct || 0) > 0
                        ? `${Math.round(team.conf_champ_overall_pct || 0)}%`
                        : ""}
                    </div>
                  </td>

                  {/* At Large Cell */}
                  <td
                    className="relative p-0"
                    style={{
                      height: cellHeight,
                      width: bidColWidth,
                      minWidth: bidColWidth,
                      maxWidth: bidColWidth,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      ...getCellColor(team.at_large_overall_pct || 0),
                    }}
                  >
                    <div
                      className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                    >
                      {(team.at_large_overall_pct || 0) > 0
                        ? `${Math.round(team.at_large_overall_pct || 0)}%`
                        : ""}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(FootballSeedTable);
