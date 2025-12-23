"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { useMemo, useState } from "react";

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

  // Generate dates: 11/1, 1st and 15th of each month, last date
  const selectedDates = useMemo(() => {
    if (!timelineData || timelineData.length === 0) {
      return [];
    }

    const allDates = [...new Set(timelineData.map((d) => d.date))].sort();

    if (allDates.length === 0) {
      return [];
    }

    const dates: string[] = [];
    const dateSet = new Set<string>();

    // Add 1st and 15th of each month
    const monthMap = new Map<string, { first?: string; fifteenth?: string }>();
    for (const dateStr of allDates) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const key = `${year}-${month}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, {});
      }

      const day = date.getDate();
      if (day === 1 && !monthMap.get(key)!.first) {
        monthMap.get(key)!.first = dateStr;
      } else if (day === 15 && !monthMap.get(key)!.fifteenth) {
        monthMap.get(key)!.fifteenth = dateStr;
      }
    }

    // Add 1st and 15th dates in order
    for (const [, dates_] of monthMap.entries()) {
      if (dates_.first && !dateSet.has(dates_.first)) {
        dates.push(dates_.first);
        dateSet.add(dates_.first);
      }
      if (dates_.fifteenth && !dateSet.has(dates_.fifteenth)) {
        dates.push(dates_.fifteenth);
        dateSet.add(dates_.fifteenth);
      }
    }

    // Sort the collected dates
    dates.sort();

    // Always add last date if not already included
    const lastDate = allDates[allDates.length - 1];
    if (!dateSet.has(lastDate)) {
      dates.push(lastDate);
    }

    return dates.map((dateStr) => new Date(dateStr));
  }, [timelineData]);

  // Build data lookup: date -> sorted teams by standing
  const dateTeamsLookup = useMemo(() => {
    console.log("🔨 Building dateTeamsLookup...");
    const lookup = new Map<string, TeamDateData[]>();

    if (!timelineData || timelineData.length === 0) {
      console.log("  ❌ No timelineData");
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

    console.log(`  ✓ Grouped into ${dateGroups.size} date buckets`);

    // For each date, sort teams by standing
    let totalTeams = 0;
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
        totalTeams += sorted.length;
      }
    });

    console.log(
      `✅ Lookup complete: ${lookup.size} dates, ${totalTeams} total teams`
    );
    return lookup;
  }, [timelineData]);

  // Format date for display
  const formatDateDisplay = (date: Date) => {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${m}/${d}`;
  };

  // Get teams for a specific date
  const getTeamsForDate = (targetDate: Date): TeamDateData[] => {
    const dateStr = targetDate.toISOString().split("T")[0];
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
  const logoSize = isMobile ? 28 : 36;
  const cellHeight = isMobile ? 36 : 44;
  const cellWidth = isMobile ? 80 : 100;
  const axisLabelWidth = isMobile ? 28 : 36;
  const borderColor = "#d1d5db";

  if (!timelineData || timelineData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No standings progression data available
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Chart */}
      <div className="overflow-x-auto p-4">
        <div className="flex" style={{ minWidth: "max-content" }}>
          {/* Left axis (position numbers) */}
          <div className="flex flex-col flex-shrink-0">
            {/* Top spacer for header */}
            <div
              style={{
                height: "48px",
                borderRight: `1px solid ${borderColor}`,
              }}
            />

            {/* Position numbers 1-conferenceSize */}
            {Array.from({ length: conferenceSize }).map((_, idx) => (
              <div
                key={`axis-${idx + 1}`}
                className="text-xs text-gray-600 flex items-center justify-end pr-3"
                style={{
                  width: `${axisLabelWidth}px`,
                  height: `${cellHeight}px`,
                  borderRight: `1px solid ${borderColor}`,
                }}
              >
                {idx + 1}
              </div>
            ))}
          </div>

          {/* Data columns */}
          <div className="flex gap-0">
            {selectedDates.map((date) => {
              const teams = getTeamsForDate(date);

              return (
                <div
                  key={`column-${date.toISOString()}`}
                  className="flex flex-col flex-shrink-0"
                >
                  {/* Column header with date */}
                  <div
                    className="text-center text-sm text-gray-700 flex items-center justify-center"
                    style={{
                      width: `${cellWidth}px`,
                      height: "48px",
                      borderRight: `1px solid ${borderColor}`,
                      borderBottom: `1px solid ${borderColor}`,
                      borderTop: `1px solid ${borderColor}`,
                    }}
                  >
                    {formatDateDisplay(date)}
                  </div>

                  {/* Position cells with team logos only */}
                  {Array.from({ length: conferenceSize }).map((_, idx) => {
                    const position = idx + 1;
                    const team = teams[idx];

                    return (
                      <div
                        key={`${date.toISOString()}-pos-${position}`}
                        className="flex items-center justify-center bg-white hover:bg-gray-50 transition-colors"
                        style={{
                          width: `${cellWidth}px`,
                          height: `${cellHeight}px`,
                          borderRight: `1px solid ${borderColor}`,
                          borderBottom: `1px solid ${borderColor}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {team ? (
                          (() => {
                            const isSelected =
                              selectedTeams.size === 0 ||
                              selectedTeams.has(team.team_name);
                            return (
                              <div
                                style={{
                                  opacity: isSelected ? 1 : 0.25,
                                  filter: isSelected
                                    ? "none"
                                    : "grayscale(100%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
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
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info text */}
      <div className="p-4 text-xs text-gray-600 border-t border-gray-200">
        <p>
          Team logos show projected standing for that date, ordered from best
          (1) to worst ({conferenceSize}). Dates shown: 11/1, first of each
          month with data, and current date.
        </p>
      </div>

      {/* Team logo selector - bottom */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs font-medium text-gray-700 mb-3">
          Filter Teams:
        </div>
        <div className="flex flex-wrap gap-2">
          {allTeams.map((team) => {
            const isSelected =
              selectedTeams.size === 0 || selectedTeams.has(team.team_name);
            return (
              <button
                key={team.team_name}
                onClick={() => handleTeamClick(team.team_name)}
                className="flex items-center justify-center p-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                style={{
                  opacity: isSelected ? 1 : 0.3,
                  filter: isSelected ? "none" : "grayscale(100%)",
                }}
              >
                <TeamLogo
                  logoUrl={
                    team.team_info.logo_url || "/images/team_logos/default.png"
                  }
                  teamName={team.team_name}
                  size={isMobile ? 20 : 24}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
