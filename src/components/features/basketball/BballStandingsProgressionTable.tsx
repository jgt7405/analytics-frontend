"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import styles from "./BballStandingsProgressionTable.module.css";

interface TimelineData {
  team_name: string;
  date: string;
  avg_standing?: number | string;
  standings_with_ties?: number | string;
  version_id?: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface BballStandingsProgressionTableProps {
  timelineData: TimelineData[];
  conferenceSize: number;
}

interface TeamDateData {
  team_name: string;
  standing: number;
  team_info: TimelineData["team_info"];
}

export default function BballStandingsProgressionTable({
  timelineData,
  conferenceSize,
}: BballStandingsProgressionTableProps) {
  const { isMobile } = useResponsive();
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());

  // Generate dates: 1st and 15th of each month, last date - IN PROPER CHRONOLOGICAL ORDER
  const selectedDates = useMemo(() => {
    if (!timelineData || timelineData.length === 0) {
      return [];
    }

    // Step 1: Get all unique dates and sort them chronologically (accounting for year)
    const allDates = [...new Set(timelineData.map((d) => d.date))].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    if (allDates.length === 0) {
      return [];
    }

    const dates: string[] = [];
    const dateSet = new Set<string>();

    // Step 2: Build monthMap from chronologically sorted allDates
    const monthMap = new Map<string, { first?: string; fifteenth?: string }>();
    for (const dateStr of allDates) {
      const parts = dateStr.split("-");
      const day = parseInt(parts[2], 10);
      const monthKey = `${parts[0]}-${parts[1]}`; // YYYY-MM

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {});
      }

      if (day === 1 && !monthMap.get(monthKey)!.first) {
        monthMap.get(monthKey)!.first = dateStr;
      } else if (day === 15 && !monthMap.get(monthKey)!.fifteenth) {
        monthMap.get(monthKey)!.fifteenth = dateStr;
      }
    }

    // Step 3: Extract month keys and sort them chronologically
    const sortedMonthKeys = Array.from(monthMap.keys()).sort(
      (a, b) => new Date(a + "-01").getTime() - new Date(b + "-01").getTime(),
    );

    // Step 4: Add 1st and 15th dates in chronological order
    for (const monthKey of sortedMonthKeys) {
      const datesByMonth = monthMap.get(monthKey)!;
      if (datesByMonth.first && !dateSet.has(datesByMonth.first)) {
        dates.push(datesByMonth.first);
        dateSet.add(datesByMonth.first);
      }
      if (datesByMonth.fifteenth && !dateSet.has(datesByMonth.fifteenth)) {
        dates.push(datesByMonth.fifteenth);
        dateSet.add(datesByMonth.fifteenth);
      }
    }

    // Step 5: Always add last date from data if not already included
    const lastDate = allDates[allDates.length - 1];
    if (lastDate && !dateSet.has(lastDate)) {
      dates.push(lastDate);
    }

    return dates;
  }, [timelineData]);

  // Build data lookup: date -> sorted teams by standing
  const dateTeamsLookup = useMemo(() => {
    const lookup = new Map<string, TeamDateData[]>();

    if (!timelineData || timelineData.length === 0) {
      return lookup;
    }

    // Group data by date
    const dateGroups = new Map<string, TimelineData[]>();
    timelineData.forEach((item) => {
      if (!dateGroups.has(item.date)) {
        dateGroups.set(item.date, []);
      }
      dateGroups.get(item.date)!.push(item);
    });

    // For each date, sort teams by standing
    dateGroups.forEach((items, dateStr) => {
      const validItems = items.filter((item) => {
        const standing = item.avg_standing ?? item.standings_with_ties;
        if (standing === null || standing === undefined) return false;
        if (typeof standing === "string") {
          const parsed = parseFloat(standing);
          return !isNaN(parsed);
        }
        return true;
      });

      const sorted = validItems
        .sort((a, b) => {
          const aStanding = a.avg_standing ?? a.standings_with_ties;
          const bStanding = b.avg_standing ?? b.standings_with_ties;
          const aVal =
            typeof aStanding === "string"
              ? parseFloat(aStanding)
              : (aStanding ?? 999);
          const bVal =
            typeof bStanding === "string"
              ? parseFloat(bStanding)
              : (bStanding ?? 999);
          return aVal - bVal;
        })
        .map((item) => {
          const standing = item.avg_standing ?? item.standings_with_ties;
          const standingNum =
            typeof standing === "string"
              ? parseFloat(standing)
              : (standing ?? 0);
          return {
            team_name: item.team_name,
            standing: standingNum,
            team_info: item.team_info,
          };
        });

      if (sorted.length > 0) {
        lookup.set(dateStr, sorted);
      }
    });

    return lookup;
  }, [timelineData]);

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    // dateStr is already YYYY-MM-DD from the data
    const [, month, day] = dateStr.split("-");
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    return `${m}/${d}`;
  };

  // Get teams for a specific date
  const getTeamsForDate = (dateStr: string): TeamDateData[] => {
    // dateStr is the exact YYYY-MM-DD string from the data
    return dateTeamsLookup.get(dateStr) || [];
  };

  // Handle team selection for filtering
  const handleTeamClick = (teamName: string) => {
    setSelectedTeams((prev) => {
      const newSet = new Set(prev);

      if (newSet.size === 0) {
        newSet.add(teamName);
      } else if (newSet.has(teamName)) {
        newSet.delete(teamName);
      } else {
        newSet.add(teamName);
      }

      return newSet;
    });
  };

  // Get all unique teams from the data
  const allTeams = useMemo(() => {
    const teamMap = new Map<string, TimelineData["team_info"]>();
    timelineData.forEach((item) => {
      if (!teamMap.has(item.team_name)) {
        teamMap.set(item.team_name, item.team_info);
      }
    });
    return Array.from(teamMap.entries()).map(([name, info]) => ({
      team_name: name,
      team_info: info,
    }));
  }, [timelineData]);

  // Responsive dimensions
  const logoSize = isMobile ? 26 : 32;
  const cellHeight = isMobile ? 34 : 42;
  const cellWidth = isMobile ? 76 : 96;
  const axisLabelWidth = isMobile ? 26 : 32;

  if (!timelineData || timelineData.length === 0) {
    return (
      <div className={styles.card}>
        <div className="p-4 text-center text-gray-500 dark:text-gray-300">
          No standings progression data available
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div
        className={styles.scrollViewport}
        role="region"
        aria-label="Projected conference standings progression. Scroll horizontally to see every date."
        tabIndex={0}
      >
        <div className={styles.grid}>
          {/* Left axis (position numbers) */}
          <div className={styles.axisColumn} style={{ width: axisLabelWidth }}>
            <div className={styles.axisHeaderSpacer} />
            {Array.from({ length: conferenceSize }).map((_, idx) => (
              <div
                key={`axis-${idx + 1}`}
                className={styles.axisCell}
                style={{ height: cellHeight }}
              >
                {idx + 1}
              </div>
            ))}
          </div>

          {/* Data columns */}
          {selectedDates.map((dateStr) => {
            const teams = getTeamsForDate(dateStr);

            return (
              <div
                key={`column-${dateStr}`}
                className={styles.dateColumn}
                style={{ width: cellWidth }}
              >
                <div className={styles.dateHeader}>
                  {formatDateDisplay(dateStr)}
                </div>

                {Array.from({ length: conferenceSize }).map((_, idx) => {
                  const position = idx + 1;
                  const team = teams[idx];

                  return (
                    <div
                      key={`${dateStr}-pos-${position}`}
                      className={styles.tileCell}
                      style={{ height: cellHeight }}
                    >
                      {team ? (
                        (() => {
                          const isSelected =
                            selectedTeams.size === 0 ||
                            selectedTeams.has(team.team_name);
                          return (
                            <div
                              className={styles.tile}
                              style={{
                                opacity: isSelected ? 1 : 0.25,
                                filter: isSelected ? "none" : "grayscale(100%)",
                              }}
                            >
                              <TeamLogo
                                logoUrl={
                                  team.team_info.logo_url ||
                                  "/images/team_logos/default.png"
                                }
                                teamName={team.team_name}
                                size={logoSize}
                              />
                            </div>
                          );
                        })()
                      ) : (
                        <span className={styles.emptyMark}>—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.footerNote}>
        <p>
          Team logos show projected standing for that date, ordered from best
          (1) to worst ({conferenceSize}).
        </p>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.filterHeading}>Filter Teams</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5 sm:gap-2">
          {allTeams.map((team) => {
            const isSelected =
              selectedTeams.size === 0 || selectedTeams.has(team.team_name);
            return (
              <button
                key={team.team_name}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${team.team_name}. Select to filter the progression grid.`}
                onClick={() => handleTeamClick(team.team_name)}
                className={cn(
                  styles.filterChip,
                  !isSelected && "opacity-30 grayscale",
                )}
              >
                <TeamLogo
                  logoUrl={
                    team.team_info.logo_url || "/images/team_logos/default.png"
                  }
                  teamName={team.team_name}
                  size={isMobile ? 18 : 22}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
