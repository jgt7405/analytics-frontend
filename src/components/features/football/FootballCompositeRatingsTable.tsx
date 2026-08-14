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
    lastUpdated?: string | null;
    sourceUrl?: string | null;
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
    columns.push({
      key: ratingKey,
      label: ratingLabel,
      numeric: true,
      lastUpdated: source.last_updated,
      sourceUrl: source.source_url,
    });
  });
  sources.forEach(function (source) {
    const rankKey = "rank_" + source.key;
    const rankLabel = source.label + " Rank";
    columns.push({
      key: rankKey,
      label: rankLabel,
      numeric: true,
      lastUpdated: source.last_updated,
      sourceUrl: source.source_url,
    });
  });
return columns;
}

function formatLastUpdated(lastUpdated: string | null | undefined): string | null {
  if (!lastUpdated) return null;
  const parsed = new Date(lastUpdated + "T00:00:00");
  if (isNaN(parsed.getTime())) return lastUpdated;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function getStickyClass(columnKey: string): string {
  if (columnKey === "rank") {
    return "sticky left-0 z-10 bg-white dark:bg-gray-900 w-12";
  }
  if (columnKey === "team_name") {
    return "sticky left-[3rem] z-10 bg-white dark:bg-gray-900 w-40 truncate";
  }
  return "";
}

function escapeCsvValue(value: string): string {
  const hasComma = value.indexOf(",") !== -1;
  const hasQuote = value.indexOf(String.fromCharCode(34)) !== -1;
  if (hasComma || hasQuote) {
    const quoteChar = String.fromCharCode(34);
    const doubled = value.split(quoteChar).join(quoteChar + quoteChar);
    return quoteChar + doubled + quoteChar;
  }
  return value;
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

  const conferenceFilterState = useState<string[]>([]);
  const selectedConferences = conferenceFilterState[0];
  const setSelectedConferences = conferenceFilterState[1];

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

  const conferenceOptions = useMemo(function () {
    const seen = new Set<string>();

    teams.forEach(function (team) {
      seen.add(team.conference);
    });
    return Array.from(seen).sort();
  }, [teams]);
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

  function toggleConference(conference: string) {
    const isSelected = selectedConferences.indexOf(conference) !== -1;
    if (isSelected) {
      setSelectedConferences(selectedConferences.filter(function (c) { return c !== conference; }));
    } else {
      setSelectedConferences(selectedConferences.concat([conference]));
    }
  }

  const filteredTeams = teams.filter(function (team) {
    if (selectedConferences.length > 0 && selectedConferences.indexOf(team.conference) === -1) {
      return false;
    }
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

  function handleDownloadCsv() {
    const headerCells = columns.map(function (column) { return escapeCsvValue(column.label); });
    const headerRow = headerCells.join(",");
    const dataRows = sortedTeams.map(function (team) {
      const cells = columns.map(function (column) {
        const value = getCellValue(column, team, sourceRankMaps);
        return escapeCsvValue(formatCellValue(column, value));
      });
      return cells.join(",");
    });
    const allRows = [headerRow].concat(dataRows);
    const csvText = allRows.join(String.fromCharCode(10));
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "composite_football_ratings.csv";
    link.click();
    URL.revokeObjectURL(url);
  }


  if (teams.length === 0) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-300 py-8 text-center">
        No composite ratings available for this date.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Download CSV
        </button>
      </div>
    <div className="overflow-x-auto overflow-y-auto max-h-[70vh] border border-gray-200 dark:border-gray-700 rounded">
      <table className="min-w-full text-sm border-collapse">
        <thead className="sticky top-0 z-20 bg-white dark:bg-gray-900">
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
                    " py-2 px-3 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap cursor-pointer select-none hover:text-[rgb(0,151,178)]" +
                    getStickyClass(column.key)
                  }
                >
                  {column.label}
                  {arrow ? <span className="text-xs ml-1">{arrow}</span> : null}
                  {column.sourceUrl ? (
                    <a
                      href={column.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={"Open " + column.label.replace(/ (Rtg|Rank)$/, "") + " source site"}
                      onClick={function (e) {
                        e.stopPropagation();
                      }}
                      className="ml-1 inline-block align-middle text-gray-400 hover:text-[rgb(0,151,178)]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ) : null}
                  {formatLastUpdated(column.lastUpdated) ? (
                    <div className="text-[10px] font-normal text-gray-400 dark:text-gray-500 normal-case">
                      Updated {formatLastUpdated(column.lastUpdated)}
                    </div>
                  ) : null}
                </th>
              );
            })}
          </tr>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {columns.map(function (column) {
              if (column.key === "conference") {
                return (
                  <th key={column.key} className="py-1 px-3 relative">
                    <details className="relative">
                      <summary className="cursor-pointer list-none text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-800 truncate">
                        {selectedConferences.length === 0 ? "All" : selectedConferences.length + " selected"}
                      </summary>
                      <div className="absolute z-10 mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-64 overflow-y-auto p-2 min-w-[10rem]">
                        <div className="flex gap-2 mb-1.5 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={function () {
                              setSelectedConferences(conferenceOptions.slice());
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={function () {
                              setSelectedConferences([]);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                        {conferenceOptions.map(function (conference) {
                          return (
                            <label key={conference} className="flex items-center gap-1.5 text-xs py-0.5 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedConferences.indexOf(conference) !== -1}
                                onChange={function () {
                                  toggleConference(conference);
                                }}
                              />
                              <span>{conference}</span>
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  </th>
                );
              }
              return (
                <th key={column.key} className={"py-1 px-3 " + getStickyClass(column.key)}>
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
                      className={alignClass + " py-2 px-3 " + textColorClass + " " + getStickyClass(column.key)}
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
    </div>
  );
}
