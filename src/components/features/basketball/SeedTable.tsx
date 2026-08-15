// src/components/features/basketball/SeedTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import type { SeedTeam } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { memo, ReactNode, useMemo, useState } from "react";
import styles from "./SeedTable.module.css";

interface SeedTableProps {
  seedData: SeedTeam[];
  className?: string;
  showAllTeams?: boolean;
  season?: string;
  /** Optional element (e.g. conference selector) rendered on the right of the title row. */
  headerRight?: ReactNode;
}

type SortColumn =
  | "tournament_bid_pct"
  | "average_seed"
  | "auto_bid_overall_pct"
  | "at_large_overall_pct"
  | "first_four_out"
  | "next_four_out"
  | "out_of_tourney"
  | string; // For seed columns like "1", "2", etc.

function SeedTable({
  seedData,
  className,
  showAllTeams = false,
  season,
  headerRight,
}: SeedTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [rowsToShow, setRowsToShow] = useState<number>(seedData.length);
  const [inputValue, setInputValue] = useState<string>(
    seedData.length.toString()
  );

  const navigateToTeam = (teamName: string) => {
    const path = season
      ? `/basketball/${season}/team/${encodeURIComponent(teamName)}`
      : `/basketball/team/${encodeURIComponent(teamName)}`;
    router.push(path);
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
        } else if (sortColumn === "auto_bid_overall_pct") {
          aVal = a.auto_bid_overall_pct || 0;
          bVal = b.auto_bid_overall_pct || 0;
          // Sort descending (highest first)
          if (aVal !== bVal) return bVal - aVal;
        } else if (sortColumn === "at_large_overall_pct") {
          aVal = a.at_large_overall_pct || 0;
          bVal = b.at_large_overall_pct || 0;
          // Sort descending (highest first)
          if (aVal !== bVal) return bVal - aVal;
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
        } else if (sortColumn === "out_of_tourney") {
          // Calculate Out of Tourney percentage: 100% - In Tourney %
          const aInTourney =
            a.tournament_bid_pct && a.tournament_bid_pct <= 1
              ? a.tournament_bid_pct * 100
              : a.tournament_bid_pct || 0;
          aVal = 100 - aInTourney;

          const bInTourney =
            b.tournament_bid_pct && b.tournament_bid_pct <= 1
              ? b.tournament_bid_pct * 100
              : b.tournament_bid_pct || 0;
          bVal = 100 - bInTourney;

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
  const firstColWidth = isMobile ? 60 : 150;
  const avgSeedColWidth = isMobile ? 50 : 70;
  const seedColWidth = isMobile ? 25 : 35;
  const tourneyColWidth = isMobile ? 50 : 70;
  const outColWidth = isMobile ? 40 : 50;
  const bidColWidth = isMobile ? 40 : 50;
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 40 : 48;

  // Format tournament percentage
  const formatTournamentPct = (value?: number) => {
    if (value === null || value === undefined) return "-";
    if (value > 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return `${Math.round(value)}%`;
  };

  // Get yellow color for First/Next Four Out cells
  const getOutColor = (value: number) => {
    if (value === 0) return { backgroundColor: "var(--bg-primary)", color: "transparent" };
    const white = [255, 255, 255];
    const yellow = [255, 230, 113];

    const ratio = Math.min(value / 100, 1);
    const r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
    const g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
    const b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);

    return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: "black" };
  };

  // Helper function for compact headers
  const getCompactHeader = (label: string): string => {
    if (label === "In Tourney") return "In\nTourney";
    if (label === "First Four Out") return "First\nFour Out";
    if (label === "Next Four Out") return "Next\nFour Out";
    if (label === "Out of Tourney") return "Out of\nTourney";
    if (label === "Auto Bid") return "Auto\nBid";
    if (label === "At Large") return "At\nLarge";
    return label;
  };

  if (!seedData || seedData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No seed data available
      </div>
    );
  }

  // Tournament status columns
  const tournamentStatusColumns = [
    "In Tourney",
    "First Four Out",
    "Next Four Out",
    "Out of Tourney",
  ];

  // Bid category columns
  const bidCategoryColumns = ["Auto Bid", "At Large"];

  return (
    <div className={cn(styles.card, "seed-table", className)}>
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 className={styles.title}>NCAA Tournament Seed Projections</h2>
        </div>
        {headerRight && <div data-screenshot-hide="true">{headerRight}</div>}
      </div>

      {/* Row filter - only show when All Teams is selected */}
      {showAllTeams && (
        <div className={styles.filterRow}>
          <label
            className={`text-gray-700 dark:text-gray-300 font-medium ${isMobile ? "text-xs" : "text-sm"}`}
          >
            Show top:
          </label>
          <input
            type="number"
            min="1"
            max={seedData.length}
            value={inputValue}
            onChange={handleRowsInputChange}
            className={cn(styles.filterInput, isMobile ? "text-xs" : "text-sm")}
            placeholder={seedData.length.toString()}
          />
          <span className={`text-gray-600 dark:text-gray-300 ${isMobile ? "text-xs" : "text-sm"}`}>
            teams (of {seedData.length})
          </span>
        </div>
      )}

      <div className={styles.scrollViewport}>
        <table className={styles.table}>
          <thead>
            {/* First header row - category groupings */}
            <tr>
              <th
                className={cn(styles.headerCell, styles.stickyCell, isMobile ? "text-xs" : "text-sm")}
                style={{
                  width: rankColWidth,
                  minWidth: rankColWidth,
                  maxWidth: rankColWidth,
                  height: headerHeight,
                  left: 0,
                }}
              >
                #
              </th>

              <th
                className={cn(styles.headerCell, styles.stickyCell, isMobile ? "text-xs" : "text-sm")}
                style={{
                  width: firstColWidth,
                  minWidth: firstColWidth,
                  maxWidth: firstColWidth,
                  height: headerHeight,
                  textAlign: "left",
                  paddingLeft: "0.5rem",
                  left: rankColWidth,
                }}
              >
                Team
              </th>

              {/* Seed Category Header - INCLUDES Wgtd Avg Seed + Seeds 1-16 */}
              <th
                colSpan={seedColumns.length + 1}
                className={cn(styles.headerCell, isMobile ? "text-xs" : "text-sm")}
              >
                Seed
              </th>

              {/* NCAA Tournament Status Category Header */}
              <th
                colSpan={tournamentStatusColumns.length}
                className={cn(styles.headerCell, isMobile ? "text-xs" : "text-sm")}
              >
                NCAA Tournament Status
              </th>

              {/* Bid Category Header */}
              <th
                colSpan={bidCategoryColumns.length}
                className={cn(styles.headerCell, isMobile ? "text-xs" : "text-sm")}
              >
                Bid Category
              </th>
            </tr>

            {/* Second header row - individual columns */}
            <tr>
              {/* Rank column placeholder - rowSpan on a sticky <th> doesn't
                  reliably stick across browsers, so the rank/team headers
                  are two real per-row cells instead; this one just extends
                  the sticky white background under row 1's "#" header and
                  is itself sticky (top: headerHeight) so it stays pinned
                  alongside the rest of row 2. */}
              <th
                className={styles.stickyCell}
                style={{
                  width: rankColWidth,
                  minWidth: rankColWidth,
                  maxWidth: rankColWidth,
                  height: headerHeight,
                  top: headerHeight,
                  left: 0,
                }}
              />

              {/* Team column placeholder - see rank column note above. */}
              <th
                className={styles.stickyCell}
                style={{
                  width: firstColWidth,
                  minWidth: firstColWidth,
                  maxWidth: firstColWidth,
                  height: headerHeight,
                  top: headerHeight,
                  left: rankColWidth,
                }}
              />

              {/* Wgtd Avg Seed Column - FIRST under Seed category */}
              <th
                className={cn(
                  styles.colHeaderCell,
                  sortColumn === "average_seed" && styles.colHeaderCellActive,
                  isMobile ? "text-xs" : "text-sm",
                )}
                onClick={() => handleColumnClick("average_seed")}
                style={{
                  width: avgSeedColWidth,
                  minWidth: avgSeedColWidth,
                  maxWidth: avgSeedColWidth,
                  height: headerHeight,
                  top: headerHeight,
                  fontSize: isMobile ? "10px" : "11px",
                }}
                title="Click to sort by average seed"
              >
                Wgtd Avg{"\n"}Seed
                {sortColumn === "average_seed" && (
                  <div className={styles.sortArrow}>▲</div>
                )}
              </th>

              {/* Seed Columns 1-16 */}
              {seedColumns.map((seed) => (
                <th
                  key={`seed-${seed}`}
                  className={cn(
                    styles.colHeaderCell,
                    sortColumn === seed.toString() && styles.colHeaderCellActive,
                    isMobile ? "text-xs" : "text-sm",
                  )}
                  onClick={() => handleColumnClick(seed.toString())}
                  style={{
                    width: seedColWidth,
                    minWidth: seedColWidth,
                    maxWidth: seedColWidth,
                    height: headerHeight,
                    top: headerHeight,
                  }}
                  title={`Click to sort by seed ${seed}`}
                >
                  {seed}
                  {sortColumn === seed.toString() && (
                    <div className={styles.sortArrow}>▼</div>
                  )}
                </th>
              ))}

              {/* In Tourney Column */}
              <th
                className={cn(
                  styles.colHeaderCell,
                  sortColumn === "tournament_bid_pct" && styles.colHeaderCellActive,
                  isMobile ? "text-xs" : "text-sm",
                )}
                onClick={() => handleColumnClick("tournament_bid_pct")}
                style={{
                  width: tourneyColWidth,
                  minWidth: tourneyColWidth,
                  maxWidth: tourneyColWidth,
                  height: headerHeight,
                  top: headerHeight,
                  fontSize: isMobile ? "10px" : "11px",
                }}
                title="Click to sort by tournament probability"
              >
                {getCompactHeader("In Tourney")}
                {sortColumn === "tournament_bid_pct" && (
                  <div className={styles.sortArrow}>▼</div>
                )}
              </th>

              {/* First Four Out Column */}
              <th
                className={cn(
                  styles.colHeaderCell,
                  sortColumn === "first_four_out" && styles.colHeaderCellActive,
                  isMobile ? "text-xs" : "text-sm",
                )}
                onClick={() => handleColumnClick("first_four_out")}
                style={{
                  width: outColWidth,
                  minWidth: outColWidth,
                  maxWidth: outColWidth,
                  height: headerHeight,
                  top: headerHeight,
                  fontSize: isMobile ? "10px" : "11px",
                }}
                title="Click to sort by First Four Out"
              >
                {getCompactHeader("First Four Out")}
                {sortColumn === "first_four_out" && (
                  <div className={styles.sortArrow}>▼</div>
                )}
              </th>

              {/* Next Four Out Column */}
              <th
                className={cn(
                  styles.colHeaderCell,
                  sortColumn === "next_four_out" && styles.colHeaderCellActive,
                  isMobile ? "text-xs" : "text-sm",
                )}
                onClick={() => handleColumnClick("next_four_out")}
                style={{
                  width: outColWidth,
                  minWidth: outColWidth,
                  maxWidth: outColWidth,
                  height: headerHeight,
                  top: headerHeight,
                  fontSize: isMobile ? "10px" : "11px",
                }}
                title="Click to sort by Next Four Out"
              >
                {getCompactHeader("Next Four Out")}
                {sortColumn === "next_four_out" && (
                  <div className={styles.sortArrow}>▼</div>
                )}
              </th>

              {/* Out of Tourney Column */}
              <th
                className={cn(
                  styles.colHeaderCell,
                  sortColumn === "out_of_tourney" && styles.colHeaderCellActive,
                  isMobile ? "text-xs" : "text-sm",
                )}
                onClick={() => handleColumnClick("out_of_tourney")}
                style={{
                  width: outColWidth,
                  minWidth: outColWidth,
                  maxWidth: outColWidth,
                  height: headerHeight,
                  top: headerHeight,
                  fontSize: isMobile ? "10px" : "11px",
                }}
                title="Click to sort by Out of Tourney"
              >
                {getCompactHeader("Out of Tourney")}
                {sortColumn === "out_of_tourney" && (
                  <div className={styles.sortArrow}>▼</div>
                )}
              </th>

              {/* Auto Bid Column */}
              <th
                className={cn(
                  styles.colHeaderCell,
                  sortColumn === "auto_bid_overall_pct" && styles.colHeaderCellActive,
                  isMobile ? "text-xs" : "text-sm",
                )}
                onClick={() => handleColumnClick("auto_bid_overall_pct")}
                style={{
                  width: bidColWidth,
                  minWidth: bidColWidth,
                  maxWidth: bidColWidth,
                  height: headerHeight,
                  top: headerHeight,
                  fontSize: isMobile ? "10px" : "11px",
                }}
                title="Click to sort by Auto Bid percentage"
              >
                {getCompactHeader("Auto Bid")}
                {sortColumn === "auto_bid_overall_pct" && (
                  <div className={styles.sortArrow}>▼</div>
                )}
              </th>

              {/* At Large Column */}
              <th
                className={cn(
                  styles.colHeaderCell,
                  sortColumn === "at_large_overall_pct" && styles.colHeaderCellActive,
                  isMobile ? "text-xs" : "text-sm",
                )}
                onClick={() => handleColumnClick("at_large_overall_pct")}
                style={{
                  width: bidColWidth,
                  minWidth: bidColWidth,
                  maxWidth: bidColWidth,
                  height: headerHeight,
                  top: headerHeight,
                  fontSize: isMobile ? "10px" : "11px",
                }}
                title="Click to sort by At Large percentage"
              >
                {getCompactHeader("At Large")}
                {sortColumn === "at_large_overall_pct" && (
                  <div className={styles.sortArrow}>▼</div>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedTeams.map((team, index) => (
              <tr key={`${team.team_name}-${index}`}>
                {/* Rank Cell */}
                <td
                  className={cn(
                    styles.rankCell,
                    styles.stickyBodyCell,
                    isMobile ? "text-xs" : "text-sm",
                  )}
                  style={{
                    width: rankColWidth,
                    minWidth: rankColWidth,
                    maxWidth: rankColWidth,
                    height: cellHeight,
                    left: 0,
                  }}
                >
                  {index + 1}
                </td>

                {/* Team Cell */}
                <td
                  className={cn(
                    styles.teamCell,
                    styles.stickyBodyCell,
                    isMobile ? "text-xs" : "text-sm",
                  )}
                  style={{
                    width: firstColWidth,
                    minWidth: firstColWidth,
                    maxWidth: firstColWidth,
                    height: cellHeight,
                    paddingLeft: "0.5rem",
                    left: rankColWidth,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.team_name}
                      size={28}
                      onClick={() => navigateToTeam(team.team_name)}
                    />
                    {!isMobile && (
                      <span className="truncate text-[0.88rem] font-semibold">
                        {team.team_name}
                      </span>
                    )}
                  </div>
                </td>

                {/* Average Seed Cell */}
                <td
                  className={cn(
                    styles.plainCell,
                    "font-bold",
                    isMobile ? "text-xs" : "text-sm",
                  )}
                  style={{
                    width: avgSeedColWidth,
                    minWidth: avgSeedColWidth,
                    maxWidth: avgSeedColWidth,
                    height: cellHeight,
                  }}
                >
                  {team.average_seed ? team.average_seed.toFixed(1) : "-"}
                </td>

                {/* Seed Cells 1-16 */}
                {seedColumns.map((seedNum) => {
                  const value =
                    team.seed_distribution?.[seedNum.toString()] || 0;

                  return (
                    <td
                      key={`${team.team_name}-seed-${seedNum}`}
                      style={{
                        height: cellHeight,
                        width: seedColWidth,
                        minWidth: seedColWidth,
                        maxWidth: seedColWidth,
                        padding: 0,
                      }}
                    >
                      <div
                        className={cn(styles.heatTile, isMobile ? "text-xs" : "text-sm")}
                        style={getCellColor(value)}
                      >
                        {value > 0 ? `${Math.round(value)}%` : ""}
                      </div>
                    </td>
                  );
                })}

                {/* In Tourney Cell */}
                <td
                  style={{
                    height: cellHeight,
                    width: tourneyColWidth,
                    minWidth: tourneyColWidth,
                    maxWidth: tourneyColWidth,
                    padding: 0,
                  }}
                >
                  <div
                    className={cn(styles.heatTile, isMobile ? "text-xs" : "text-sm")}
                    style={getCellColor(
                      team.tournament_bid_pct && team.tournament_bid_pct <= 1
                        ? team.tournament_bid_pct * 100
                        : team.tournament_bid_pct || 0
                    )}
                  >
                    {formatTournamentPct(team.tournament_bid_pct)}
                  </div>
                </td>

                {/* First Four Out Cell */}
                <td
                  style={{
                    height: cellHeight,
                    width: outColWidth,
                    minWidth: outColWidth,
                    maxWidth: outColWidth,
                    padding: 0,
                  }}
                >
                  <div
                    className={cn(styles.heatTile, isMobile ? "text-xs" : "text-sm")}
                    style={getOutColor(
                      team.seed_distribution?.["First Four Out"] || 0
                    )}
                  >
                    {(team.seed_distribution?.["First Four Out"] || 0) > 0
                      ? `${Math.round(team.seed_distribution["First Four Out"])}%`
                      : ""}
                  </div>
                </td>

                {/* Next Four Out Cell */}
                <td
                  style={{
                    height: cellHeight,
                    width: outColWidth,
                    minWidth: outColWidth,
                    maxWidth: outColWidth,
                    padding: 0,
                  }}
                >
                  <div
                    className={cn(styles.heatTile, isMobile ? "text-xs" : "text-sm")}
                    style={getOutColor(
                      team.seed_distribution?.["Next Four Out"] || 0
                    )}
                  >
                    {(team.seed_distribution?.["Next Four Out"] || 0) > 0
                      ? `${Math.round(team.seed_distribution["Next Four Out"])}%`
                      : ""}
                  </div>
                </td>

                {/* Out of Tourney Cell */}
                <td
                  style={{
                    height: cellHeight,
                    width: outColWidth,
                    minWidth: outColWidth,
                    maxWidth: outColWidth,
                    padding: 0,
                  }}
                >
                  <div
                    className={cn(styles.heatTile, isMobile ? "text-xs" : "text-sm")}
                    style={getOutColor(
                      100 -
                        (team.tournament_bid_pct && team.tournament_bid_pct <= 1
                          ? team.tournament_bid_pct * 100
                          : team.tournament_bid_pct || 0)
                    )}
                  >
                    {(() => {
                      const outOfTourneyPct =
                        100 -
                        (team.tournament_bid_pct && team.tournament_bid_pct <= 1
                          ? team.tournament_bid_pct * 100
                          : team.tournament_bid_pct || 0);
                      return outOfTourneyPct > 0
                        ? `${Math.round(outOfTourneyPct)}%`
                        : "";
                    })()}
                  </div>
                </td>

                {/* Auto Bid Cell */}
                <td
                  style={{
                    height: cellHeight,
                    width: bidColWidth,
                    minWidth: bidColWidth,
                    maxWidth: bidColWidth,
                    padding: 0,
                  }}
                >
                  <div
                    className={cn(styles.heatTile, isMobile ? "text-xs" : "text-sm")}
                    style={getCellColor(team.auto_bid_overall_pct ?? 0)}
                  >
                    {(team.auto_bid_overall_pct ?? 0) > 0
                      ? `${Math.round(team.auto_bid_overall_pct!)}%`
                      : ""}
                  </div>
                </td>

                {/* At Large Cell */}
                <td
                  style={{
                    height: cellHeight,
                    width: bidColWidth,
                    minWidth: bidColWidth,
                    maxWidth: bidColWidth,
                    padding: 0,
                  }}
                >
                  <div
                    className={cn(styles.heatTile, isMobile ? "text-xs" : "text-sm")}
                    style={getCellColor(team.at_large_overall_pct ?? 0)}
                  >
                    {(team.at_large_overall_pct ?? 0) > 0
                      ? `${Math.round(team.at_large_overall_pct!)}%`
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
