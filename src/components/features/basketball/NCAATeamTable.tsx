// src/components/features/basketball/NCAATeamTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import { NCAATeam } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { memo, ReactNode, useEffect, useMemo, useState } from "react";
import styles from "./NCAATeamTable.module.css";

interface NCAATeamTableProps {
  ncaaData: NCAATeam[];
  className?: string;
  showAllTeams?: boolean;
  hasActualBracket?: boolean;
  season?: string;
  /** Optional element (e.g. conference selector) rendered on the right of the title row. */
  headerRight?: ReactNode;
}

type RoundKey =
  | "NCAA_First_Round"
  | "NCAA_Second_Round"
  | "NCAA_Sweet_Sixteen"
  | "NCAA_Elite_Eight"
  | "NCAA_Final_Four"
  | "NCAA_Championship"
  | "NCAA_Champion";

const ROUND_ORDER = [
  "NCAA_First_Round",
  "NCAA_Second_Round",
  "NCAA_Sweet_Sixteen",
  "NCAA_Elite_Eight",
  "NCAA_Final_Four",
  "NCAA_Championship",
  "NCAA_Champion",
] as const;

const FIELD_TO_LABEL: Record<RoundKey, string> = {
  NCAA_First_Round: "First\nRound",
  NCAA_Second_Round: "Second\nRound",
  NCAA_Sweet_Sixteen: "Sweet\nSixteen",
  NCAA_Elite_Eight: "Elite\nEight",
  NCAA_Final_Four: "Final\nFour",
  NCAA_Championship: "Champion-\nship",
  NCAA_Champion: "Champion",
};

// Single-line form of a header label for tooltips/aria ("Champion-\nship" -> "Championship").
const inlineLabel = (round: RoundKey) =>
  FIELD_TO_LABEL[round].replace("-\n", "").replace("\n", " ");

function NCAATeamTable({
  ncaaData,
  className,
  showAllTeams = false,
  hasActualBracket = false,
  season,
  headerRight,
}: NCAATeamTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [sortColumn, setSortColumn] = useState<RoundKey | null>(null);
  const [rowsToShow, setRowsToShow] = useState<number>(ncaaData.length);
  const [inputValue, setInputValue] = useState<string>(
    ncaaData.length.toString(),
  );

  // Reset to show all rows when switching to "All Teams"
  useEffect(() => {
    if (showAllTeams) {
      setRowsToShow(ncaaData.length);
      setInputValue(ncaaData.length.toString());
    }
  }, [showAllTeams, ncaaData.length]);

  const navigateToTeam = (teamName: string) => {
    const path = season
      ? `/basketball/${season}/team/${encodeURIComponent(teamName)}`
      : `/basketball/team/${encodeURIComponent(teamName)}`;
    router.push(path);
  };

  const sortedTeams = useMemo(() => {
    const teams = [...ncaaData];

    if (hasActualBracket && !sortColumn) {
      // When actual bracket exists and no column sort, default sort by seed
      return teams.sort((a, b) => {
        const aSeed = a.ncaa_actual_seed ?? 999;
        const bSeed = b.ncaa_actual_seed ?? 999;
        if (aSeed !== bSeed) return aSeed - bSeed;
        // Tiebreak by champion probability
        const reverseRounds = [...ROUND_ORDER].reverse();
        for (const round of reverseRounds) {
          const aVal = (a[round as keyof NCAATeam] as number) || 0;
          const bVal = (b[round as keyof NCAATeam] as number) || 0;
          if (aVal !== bVal) return bVal - aVal;
        }
        return a.team_name.localeCompare(b.team_name);
      });
    }

    if (sortColumn) {
      // When a specific column is selected, sort by that column first
      return teams.sort((a, b) => {
        // Primary sort by selected column (descending)
        const aVal = (a[sortColumn] as number) || 0;
        const bVal = (b[sortColumn] as number) || 0;
        if (aVal !== bVal) return bVal - aVal;

        // Secondary sort by remaining columns in reverse order (Champion -> First Round)
        const reverseRounds = [...ROUND_ORDER]
          .reverse()
          .filter((r) => r !== sortColumn);
        for (const round of reverseRounds) {
          const aSecondary = (a[round as keyof NCAATeam] as number) || 0;
          const bSecondary = (b[round as keyof NCAATeam] as number) || 0;
          if (aSecondary !== bSecondary) return bSecondary - aSecondary;
        }

        // Final tiebreaker: alphabetical order by team name
        return a.team_name.localeCompare(b.team_name);
      });
    }

    // Default sort (Champion -> Championship -> ... -> First Round)
    return teams.sort((a, b) => {
      const reverseRounds = [...ROUND_ORDER].reverse();
      for (const round of reverseRounds) {
        const aVal = (a[round as keyof NCAATeam] as number) || 0;
        const bVal = (b[round as keyof NCAATeam] as number) || 0;
        if (aVal !== bVal) return bVal - aVal;
      }

      // Final tiebreaker: alphabetical order by team name
      return a.team_name.localeCompare(b.team_name);
    });
  }, [ncaaData, sortColumn, hasActualBracket]);

  // Apply row limit filter
  const displayedTeams = useMemo(() => {
    if (showAllTeams) {
      return sortedTeams.slice(0, rowsToShow);
    }
    return sortedTeams;
  }, [sortedTeams, rowsToShow, showAllTeams]);

  const handleColumnClick = (round: RoundKey) => {
    setSortColumn(sortColumn === round ? null : round);
  };

  const handleRowsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0 && numValue <= ncaaData.length) {
      setRowsToShow(numValue);
    }
  };

  if (!ncaaData || ncaaData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No NCAA tournament data available
      </div>
    );
  }

  return (
    <section
      className={cn(styles.card, "ncaa-tourney-table", className)}
      aria-labelledby="ncaa-tourney-title"
    >
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 id="ncaa-tourney-title" className={styles.title}>
            NCAA Tournament Projections
          </h2>
        </div>
        {headerRight && <div data-screenshot-hide="true">{headerRight}</div>}
      </div>

      {/* Row filter - only show when All Teams is selected */}
      {showAllTeams && (
        <div className={styles.filterRow}>
          <label
            htmlFor="ncaa-rows-to-show"
            className={cn(styles.filterLabel, isMobile ? "text-xs" : "text-sm")}
          >
            Show top:
          </label>
          <input
            id="ncaa-rows-to-show"
            type="number"
            min="1"
            max={ncaaData.length}
            value={inputValue}
            onChange={handleRowsInputChange}
            className={cn(styles.filterInput, isMobile ? "text-xs" : "text-sm")}
            placeholder={ncaaData.length.toString()}
          />
          <span className={cn(styles.filterHint, isMobile ? "text-xs" : "text-sm")}>
            teams (of {ncaaData.length})
          </span>
        </div>
      )}

      <div
        className={styles.scrollViewport}
        role="region"
        aria-label="NCAA tournament round probabilities by team. Scroll to see every team."
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={cn(styles.stickyHead, styles.rankCol)} scope="col">
                #
              </th>
              <th className={cn(styles.stickyHead, styles.teamCol)} scope="col">
                Team
              </th>
              {ROUND_ORDER.map((round) => {
                const isActive = sortColumn === round;
                return (
                  <th
                    key={round}
                    scope="col"
                    aria-sort={isActive ? "descending" : "none"}
                    className={cn(styles.sortable, isActive && styles.sortActive)}
                  >
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => handleColumnClick(round)}
                      title="Click to sort by this column"
                      aria-label={`Sort by ${inlineLabel(round)}`}
                    >
                      {FIELD_TO_LABEL[round]}
                      {isActive && (
                        <span className={styles.sortArrow} aria-hidden="true">
                          ▼
                        </span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayedTeams.map((team, index) => (
              <tr key={`${team.team_name}-${index}`} className={styles.bodyRow}>
                {/* Rank/Seed cell - show actual seed when bracket exists */}
                <td className={cn(styles.stickyBody, styles.rankCol, styles.rankCell)}>
                  {hasActualBracket && team.ncaa_actual_seed
                    ? team.ncaa_actual_seed
                    : index + 1}
                </td>
                <td className={cn(styles.stickyBody, styles.teamCol, styles.teamCell)}>
                  <button
                    type="button"
                    className={styles.teamButton}
                    onClick={() => navigateToTeam(team.team_name)}
                    aria-label={`View ${team.team_name}`}
                  >
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.team_name}
                      size={24}
                      showTooltip
                      className={styles.teamLogo}
                    />
                    <span className={styles.teamName}>{team.team_name}</span>
                  </button>
                </td>
                {ROUND_ORDER.map((round) => {
                  const value = (team[round as keyof NCAATeam] as number) || 0;
                  const rounded = Math.round(value);
                  return (
                    <td key={round} className={styles.probabilityCell}>
                      <div
                        className={styles.heatTile}
                        data-screenshot-tile="true"
                        style={value > 0 ? getCellColor(value) : undefined}
                        title={
                          value > 0
                            ? `${team.team_name}: ${rounded}% chance of reaching ${inlineLabel(round)}`
                            : undefined
                        }
                      >
                        {value > 0 ? `${rounded}%` : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default memo(NCAATeamTable);
