"use client";

import { CompositeRatingSource, CompositeRatingTeam } from "@/types/football";
import { useMemo, useState } from "react";

const EMPTY_SOURCES: CompositeRatingSource[] = [];

interface FootballCompositeRatingsTableProps {
  teams: CompositeRatingTeam[];
  sources?: CompositeRatingSource[];
}

type CellValue = number | string | null;
type SortDirection = "asc" | "desc";

interface ColumnDef {
  key: string;
    label: string;
    numeric: boolean;
}

function buildColumns(sources: CompositeRatingSource[]): ColumnDef[] {
  const columns: ColumnDef[] = [
    { key: "rank", label: "Rank", numeric: true },
    { key: "team_name", label: "Team", numeric: false },
    { key: "conference", label: "Conference", numeric: false },
    { key: "display_score", label: "Composite Rtg %", numeric: true },
    { key: "composite_rating", label: "Z-Score", numeric: true },
    { key: "num_sources", label: "# Sources", numeric: true },
  ];


  sources.forEach(function (source) {
    const ratingKey = "rating_" + source.key;
    const ratingLabel = source.label + " Rtg";
    columns.push({ key: ratingKey, label: ratingLabel, numeric: true });
    const rankKey = "rank_" + source.key;
    const rankLabel = source.label + " Rank";
    columns.push({ key: rankKey, label: rankLabel, numeric: true });
  });
return columns;
}

function computeSourceRanks(teams: CompositeRatingTeam[], sourceKey: string): Map<string, number> {
  const withValues: CompositeRatingTeam[] = [];
  for (let i = 0; i < teams.length; i++) {
        const value = teams[i].sources[sourceKey];;
    if (typeof value === "number") {

      withValues.push(teams[i]);;
    }
  }
  withValues.sort(function (a, b) {
    return (b.sources[sourceKey] as number) - (a.sources[sourceKey] as number);
  });
  const ranks = new Map<string, number>();
  for (let j = 0; j < withValues.length; j++) {
    ranks.set(withValues[j].team_name, j + 1);;
  }
  return ranks;
}

function getCellValue(
  column: ColumnDef,
  team: CompositeRatingTeam,
  sourceRankMaps: Record<string, Map<string, number>>,
): CellValue {
  if (column.key === "rank") return team.rank;
  if (column.key === "team_name") return team.team_name;
  if (column.key === "conference") return team.conference;
  if (column.key === "display_score") return team.display_score;
  if (column.key === "composite_rating") return team.composite_rating;
  if (column.key === "num_sources") return team.num_sources;
  if (column.key.indexOf("rating_") === 0) {
    const sourceKey = column.key.slice(7);
        const rating = team.sources[sourceKey];

    return typeof rating === "number" ? rating : null;
  }
  if (column.key.indexOf("rank_") === 0) {
    const rankSourceKey = column.key.slice(5);
        const rankMap = sourceRankMaps[rankSourceKey];
        const rankValue = rankMap ? rankMap.get(team.team_name) : undefined;
        return typeof rankValue === "number" ? rankValue : null;
  }
  return null;
}

function formatCellValue(column: ColumnDef, value: CellValue): string {
  if (value === null || value === undefined) return "-";
  if (column.key === "num_sources") return String(value) + "/10";
  if (column.key === "display_score") return typeof value === "number" ? value.toFixed(1) : "-";
    if (column.key === "composite_rating") return typeof value === "number" ? value.toFixed(3) : "-";
  if (column.key.indexOf("rating_") === 0) return typeof value === "number" ? value.toFixed(1) : "-";
  if (column.key.indexOf("rank_") === 0) return typeof value === "number" ? String(value) : "-";
  return String(value);
}

function compareValues(a: CellValue, b: CellValue): number {
    if (a === null && b === null) return 0;
  if (a === null) return 1;
    if (b === null) return -1;
    if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export default function FootballCompositeRatingsTable(
  props: FootballCompositeRatingsTableProps,
) {
  const teams = props.teams;
  const sources = props.sources || EMPTY_SOURCES;

  const sortState = useState<string | null>(null);
    const sortKey = sortState[0];
  const setSortKey = sortState[1];

  const directionState = useState<SortDirection>("asc");
  const sortDirection = directionState[0];
  const setSortDirection = directionState[1];

  const filterState = useState<Record<string, string>>({});
  const filters = filterState[0];
  const setFilters = filterState[1];

  const columns = useMemo(function () {
    return buildColumns(sources);
  }, [sources]);

  const sourceRankMaps = useMemo(function () {
    const maps: Record<string, Map<string, number>> = {};
    sources.forEach(function (source) {
      maps[source.key] = computeSourceRanks(teams, source.key);
    });
    return maps;
  }, [teams, sources]);

  function handleHeaderClick(columnKey: string) {
    if (sortKey === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
      setSortKey(columnKey);
            setSortDirection("asc");

    }
  }

  function handleFilterChange(columnKey: string, text: string) {
    const next = Object.assign({}, filters);
    next[columnKey] = text;
    setFilters(next);
  }

  const filteredTeams = teams.filter(function (team) {
    let passesAllFilters = true;
    columns.forEach(function (column) {
      const filterText = filters[column.key];
      if (filterText) {

        const value = getCellValue(column, team, sourceRankMaps);
        const display = formatCellValue(column, value);
                if (display.toLowerCase().indexOf(filterText.toLowerCase()) === -1) {
          passesAllFilters = false;
                }
            }
    });
    return passesAllFilters;
  });

  const sortedTeams = filteredTeams.slice();
  if (sortKey) {
    let activeColumn: ColumnDef | undefined;
    columns.forEach(function (column) {
      if (column.key === sortKey) activeColumn = column;
    });
    if (activeColumn) {
      const col = activeColumn;
      sortedTeams.sort(function (a, b) {
        const valueA = getCellValue(col, a, sourceRankMaps);
        const valueB = getCellValue(col, b, sourceRankMaps);
        const cmp = compareValues(valueA, valueB);

return sortDirection === "asc" ? cmp : -cmp;
      });
    }
  }

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
            {columns.map(function (column) {
              const alignClass = column.numeric ? "text-right" : "text-left";
              const arrow = sortKey === column.key
                ? (sortDirection === "asc" ? "\u2191" : "\u2193")
                                : "";
                            return (
                <th
                  key={column.key}
                  onClick={function () {
                    handleHeaderClick(column.key);
                  }}
                  className={
                    alignClass +
                    " py-2 px-3 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap cursor-pointer select-none hover:text-[rgb(0,151,178)]"
                  }
                >
                  {column.label}
                  {arrow ? <span className="text-xs ml-1">{arrow}</span> : null}
                </th>
              );
            })}
          </tr>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {columns.map(function (column) {
              return (
                <th key={column.key} className="py-1 px-3">
                  <input
                    type="text"
                    value={filters[column.key] || ""}
                    onChange={function (e) {
                      handleFilterChange(column.key, e.target.value);
                    }}
                    placeholder="Filter"
                    className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-800"
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedTeams.map(function (team) {
            return (
              <tr
                key={team.team_name}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {columns.map(function (column) {
                  const value = getCellValue(column, team, sourceRankMaps);
                    const display = formatCellValue(column, value);
                    const alignClass = column.numeric ? "text-right" : "text-left";
                                    const textColorClass =
                    column.key === "team_name"
                                      ? "font-medium text-gray-800 dark:text-gray-100"
                      : "text-gray-600 dark:text-gray-300";
                  return (
                    <td
                      key={column.key}
                      className={alignClass + " py-2 px-3 " + textColorClass}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
