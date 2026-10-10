"use client";

import {
  BasketballCompositeRatingSource,
  BasketballCompositeRatingTeam,
} from "@/types/basketball";
import { useMemo, useState } from "react";
import CompositeTeamPicker from "@/components/features/shared/CompositeTeamPicker";

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
  lastUpdated?: string | null;
}

// Column order: the composite first, then per source its published rating, its
// KenPom-scaled equivalent, and its rank. Grouping by source rather than by
// metric keeps each system's three numbers together, which is what makes the
// rescaling readable - you can see Torvik's raw number and what it becomes.
// Sources run from the most recently updated to the least.
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
      lastUpdated: source.last_updated,
    });
    if (source.has_adjusted) {
      columns.push({
        key: "adjusted_" + source.key,
        label: source.label + " Adj",
        numeric: true,
        sourceUrl: source.source_url,
      lastUpdated: source.last_updated,
      });
    }
    columns.push({
      key: "rank_" + source.key,
      label: source.label + " Rank",
      numeric: true,
      sourceUrl: source.source_url,
      lastUpdated: source.last_updated,
    });
  });

  return columns;
}

// Most recently updated model first; sources with no date go last.
function sortSourcesByLastUpdated(
  sources: BasketballCompositeRatingSource[],
): BasketballCompositeRatingSource[] {
  return sources.slice().sort(function (a, b) {
    if (a.last_updated === b.last_updated) return 0;
    if (!a.last_updated) return 1;
    if (!b.last_updated) return -1;
    return b.last_updated.localeCompare(a.last_updated);
  });
}

function formatLastUpdated(lastUpdated: string | null | undefined): string | null {
  if (!lastUpdated) return null;
  const parsed = new Date(lastUpdated + "T00:00:00");
  if (isNaN(parsed.getTime())) return lastUpdated;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

// Header cells are all z-30 (sticky top), so the pinned Rank/Team header
// cells need a higher layer or later header cells paint over them when the
// table scrolls sideways.
function getStickyClass(columnKey: string, isHeader = false): string {
  const layer = isHeader ? " z-40" : " z-10";
  if (columnKey === "rank") {
    return " sticky left-0" + layer + " w-14 bg-white dark:bg-slate-900";
  }
  if (columnKey === "team_name") {
    return " sticky left-14" + layer + " min-w-44 max-w-44 bg-white shadow-[1px_0_0_0_rgb(226_232_240),9px_0_14px_-14px_rgb(15_23_42)] dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(51_65_85),9px_0_14px_-14px_black]";
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
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const columns = useMemo(
    function () {
      return buildColumns(sortSourcesByLastUpdated(sources));
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
  const teamOptions = useMemo(() => teams.map((team) => team.team_name).sort(), [teams]);

  // A source with no data anywhere is called out above the table rather than
  // leaving the reader to wonder why its columns are all dashes. Deliberately
  // does not say WHY it is empty: the sites do publish year-round, so an empty
  // column means this snapshot predates them being picked up, not that the
  // rating does not exist yet.
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
    if (selectedTeams.length > 0 && !selectedTeams.includes(team.team_name)) return false;
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
    <section className="relative rounded-[1.25rem] border border-slate-200/90 bg-gradient-to-br from-white to-[#fbfdff] p-3 shadow-[0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:border-slate-700/90 dark:from-[#111827] dark:to-[#0f172a] sm:p-4">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end">
        <CompositeTeamPicker teams={teamOptions} selected={selectedTeams} onChange={setSelectedTeams} label="Filter teams" />
        <div className="flex items-center justify-between gap-3 lg:justify-end">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {sortedTeams.length === teams.length
            ? String(teams.length) + " teams"
            : String(sortedTeams.length) + " of " + String(teams.length) + " teams"}
          {emptySourceLabels.length > 0
            ? " · " +
              emptySourceLabels.join(" and ") +
              (emptySourceLabels.length === 1 ? " has" : " have") +
              " no data in this snapshot; the composite is the remaining source" +
              (totalSources - emptySourceLabels.length === 1 ? "" : "s")
            : ""}
        </div>
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm hover:border-cyan-400 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          Download CSV
        </button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full border-separate border-spacing-0 text-sm tabular-nums">
          <thead className="bg-white dark:bg-slate-900">
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
                      " sticky top-0 h-[3.25rem] bg-slate-50 py-2 px-3 font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200 whitespace-nowrap cursor-pointer select-none hover:text-[rgb(0,151,178)]" +
                      (getStickyClass(column.key, true) || " z-30")
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
                    <th key={column.key} className="sticky top-[3.25rem] z-30 h-10 bg-slate-50 px-3 py-1 dark:bg-slate-900">
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
                    className={"sticky top-[3.25rem] h-10 bg-slate-50 px-3 py-1 dark:bg-slate-900" + (getStickyClass(column.key, true) || " z-30")}
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
                          " border-b border-slate-100 px-3 py-2.5 " +
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
    </section>
  );
}
