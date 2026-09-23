"use client";

import {
  BasketballCompositeRatingSource,
  BasketballCompositeRatingTeam,
} from "@/types/basketball";
import { useMemo, useState } from "react";

const EMPTY_SOURCES: BasketballCompositeRatingSource[] = [];

interface BasketballCompositeRatingsTableProps {
  teams: BasketballCompositeRatingTeam[];
  sources?: BasketballCompositeRatingSource[];
  totalSources: number;
}

type CellValue = number | string | null;
type SortDirection = "asc" | "desc";

interface ColumnDef {
  key: string;
  label: string;
  numeric: boolean;
  sourceUrl?: string | null;
}

// Column order: the composite first, then per source its published rating, its
// KenPom-scaled equivalent, and its rank. Grouping by source rather than by
// metric keeps each system's three numbers together, which is what makes the
// rescaling readable - you can see Torvik's raw number and what it becomes.
function buildColumns(sources: BasketballCompositeRatingSource[]): ColumnDef[] {
  const columns: ColumnDef[] = [
    { key: "rank", label: "Rank", numeric: true },
    { key: "team_name", label: "Team", numeric: false },
    { key: "conference", label: "Conference", numeric: false },
    { key: "combo_rating", label: "Composite", numeric: true },
    { key: "num_sources", label: "# Sources", numeric: true },
  ];

  sources.forEach(function (source) {
    columns.push({
      key: "rating_" + source.key,
      label: source.label + " Rtg",
      numeric: true,
      sourceUrl: source.source_url,
    });
    if (source.has_adjusted) {
      columns.push({
        key: "adjusted_" + source.key,
        label: source.label + " Adj",
        numeric: true,
        sourceUrl: source.source_url,
      });
    }
    columns.push({
      key: "rank_" + source.key,
      label: source.label + " Rank",
      numeric: true,
      sourceUrl: source.source_url,
    });
  });

  return columns;
}

function getCellValue(
  column: ColumnDef,
  team: BasketballCompositeRatingTeam,
): CellValue {
  if (column.key === "rank") return team.rank;
  if (column.key === "team_name") return team.team_name;
  if (column.key === "conference") return team.conference;
  if (column.key === "combo_rating") return team.combo_rating;
  if (column.key === "num_sources") return team.num_sources;
  if (column.key.indexOf("rating_") === 0) {
    const value = team.ratings[column.key.slice(7)];
    return typeof value === "number" ? value : null;
  }
  if (column.key.indexOf("adjusted_") === 0) {
    const value = team.adjusted_ratings[column.key.slice(9)];
    return typeof value === "number" ? value : null;
  }
  if (column.key.indexOf("rank_") === 0) {
    const value = team.ranks[column.key.slice(5)];
    return typeof value === "number" ? value : null;
  }
  return null;
}

function formatCellValue(
  column: ColumnDef,
  value: CellValue,
  totalSources: number,
): string {
  if (value === null || value === undefined) return "-";
  if (column.key === "num_sources") return String(value) + "/" + String(totalSources);
  if (column.key === "rank") return String(value);
  if (column.key.indexOf("rank_") === 0) {
    return typeof value === "number" ? String(value) : "-";
  }
  if (typeof value === "number") return value.toFixed(2);
  return String(value);
}

function getStickyClass(columnKey: string): string {
  if (columnKey === "rank") {
    return " sticky left-0 z-10 bg-white dark:bg-gray-900 w-12";
  }
  if (columnKey === "team_name") {
    return " sticky left-[3rem] z-10 bg-white dark:bg-gray-900 w-40 truncate";
  }
  return "";
}

function escapeCsvValue(value: string): string {
  const quoteChar = String.fromCharCode(34);
  const hasComma = value.indexOf(",") !== -1;
  const hasQuote = value.indexOf(quoteChar) !== -1;
  if (hasComma || hasQuote) {
    return quoteChar + value.split(quoteChar).join(quoteChar + quoteChar) + quoteChar;
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

export default function BasketballCompositeRatingsTable(
  props: BasketballCompositeRatingsTableProps,
) {
  const teams = props.teams;
  const sources = props.sources || EMPTY_SOURCES;
  const totalSources = props.totalSources;

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedConferences, setSelectedConferences] = useState<string[]>([]);

  const columns = useMemo(
    function () {
      return buildColumns(sources);
    },
    [sources],
  );

  const conferenceOptions = useMemo(
    function () {
      const seen = new Set<string>();
      teams.forEach(function (team) {
        seen.add(team.conference);
      });
      return Array.from(seen).sort();
    },
    [teams],
  );

  // Sources with nothing in them yet (Torvik and EvanMiya do not publish until
  // the season is close) are called out above the table instead of leaving the
  // reader to wonder why three columns are all dashes.
  const emptySourceLabels = useMemo(
    function () {
      return sources
        .filter(function (source) {
          return !teams.some(function (team) {
            return typeof team.ratings[source.key] === "number";
          });
        })
        .map(function (source) {
          return source.label;
        });
    },
    [teams, sources],
  );

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
    if (selectedConferences.indexOf(conference) !== -1) {
      setSelectedConferences(
        selectedConferences.filter(function (c) {
          return c !== conference;
        }),
      );
    } else {
      setSelectedConferences(selectedConferences.concat([conference]));
    }
  }

  const filteredTeams = teams.filter(function (team) {
    if (
      selectedConferences.length > 0 &&
      selectedConferences.indexOf(team.conference) === -1
    ) {
      return false;
    }
    let passes = true;
    columns.forEach(function (column) {
      const filterText = filters[column.key];
      if (filterText) {
        const display = formatCellValue(
          column,
          getCellValue(column, team),
          totalSources,
        );
        if (display.toLowerCase().indexOf(filterText.toLowerCase()) === -1) {
          passes = false;
        }
      }
    });
    return passes;
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
        const cmp = compareValues(getCellValue(col, a), getCellValue(col, b));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
  }

  function handleDownloadCsv() {
    const headerRow = columns
      .map(function (column) {
        return escapeCsvValue(column.label);
      })
      .join(",");
    const dataRows = sortedTeams.map(function (team) {
      return columns
        .map(function (column) {
          return escapeCsvValue(
            formatCellValue(column, getCellValue(column, team), totalSources),
          );
        })
        .join(",");
    });
    const csvText = [headerRow].concat(dataRows).join(String.fromCharCode(10));
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "composite_basketball_ratings.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (teams.length === 0) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-300 py-8 text-center">
        No composite ratings available.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {sortedTeams.length === teams.length
            ? String(teams.length) + " teams"
            : String(sortedTeams.length) + " of " + String(teams.length) + " teams"}
          {emptySourceLabels.length > 0
            ? " · " +
              emptySourceLabels.join(" and ") +
              " not published yet; the composite is the remaining source" +
              (totalSources - emptySourceLabels.length === 1 ? "" : "s")
            : ""}
        </div>
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
                const arrow =
                  sortKey === column.key
                    ? sortDirection === "asc"
                      ? "↑"
                      : "↓"
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
                        title={
                          "Open " +
                          column.label.replace(/ (Rtg|Adj|Rank)$/, "") +
                          " source site"
                        }
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
                          {selectedConferences.length === 0
                            ? "All"
                            : String(selectedConferences.length) + " selected"}
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
                              <label
                                key={conference}
                                className="flex items-center gap-1.5 text-xs py-0.5 whitespace-nowrap"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedConferences.indexOf(conference) !== -1
                                  }
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
                  <th
                    key={column.key}
                    className={"py-1 px-3" + getStickyClass(column.key)}
                  >
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
                    const display = formatCellValue(
                      column,
                      getCellValue(column, team),
                      totalSources,
                    );
                    const alignClass = column.numeric ? "text-right" : "text-left";
                    const textColorClass =
                      column.key === "team_name"
                        ? "font-medium text-gray-800 dark:text-gray-100"
                        : "text-gray-600 dark:text-gray-300";
                    return (
                      <td
                        key={column.key}
                        className={
                          alignClass +
                          " py-2 px-3 " +
                          textColorClass +
                          getStickyClass(column.key)
                        }
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
