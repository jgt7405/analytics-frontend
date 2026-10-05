"use client";

// Non-Conference Opponent Analysis (basketball conference data page): each
// conference's record, win %, expected win % and TWV against power and
// non-power opponents, expandable to its teams, sortable by any column.
// Calculations are in data.ts.

import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import { useResponsive } from "@/hooks/useResponsive";
import { memo, useMemo, useState } from "react";
import { computeColorRanges, sortConferences, sortTeams } from "./data";
import HeaderRows from "./HeaderRows";
import { ConferenceRow, TeamRow } from "./Rows";
import type { BasketballConfDataResponseWithNonconf, SortField, SortOrder, TableSizes } from "./types";

// PAGE_MODERNIZATION_GUIDE.md §8a card shell, as a Tailwind constant since
// this bespoke file has no CSS module of its own.
const CARD_CLASS =
  "relative isolate border border-slate-200/90 dark:border-slate-700/90 rounded-[1.25rem] bg-gradient-to-br from-white to-[#fbfdff] dark:from-[#111827] dark:to-[#0f172a] shadow-[0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:shadow-[0_24px_58px_-34px_rgb(0_0_0_/_0.82)]";

interface BballNonConfAnalysisTableProps {
  className?: string;
}

function BballNonConfAnalysisTable({ className: _className = "" }: BballNonConfAnalysisTableProps) {
  const { isMobile } = useResponsive();
  const { data, isLoading, error } = useBasketballConfData();
  const [expandedConferences, setExpandedConferences] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("total_twv_50");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const tableData = useMemo(() => {
    const response = data as BasketballConfDataResponseWithNonconf | undefined;
    return response?.nonconfData?.data || [];
  }, [data]);

  const ranges = useMemo(() => computeColorRanges(tableData), [tableData]);

  if (isLoading) {
    return <div style={{ padding: "32px", textAlign: "center" }}>Loading...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#ef4444" }}>
        Error: {error.message}
      </div>
    );
  }

  if (!tableData || tableData.length === 0) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af" }}>
        No non-conference data available
      </div>
    );
  }

  const toggleConference = (conference: string) => {
    const newExpanded = new Set(expandedConferences);
    if (newExpanded.has(conference)) {
      newExpanded.delete(conference);
    } else {
      newExpanded.add(conference);
    }
    setExpandedConferences(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === "desc" ? " ↓" : " ↑";
  };

  const sizes: TableSizes = {
    isMobile,
    expandColWidth: isMobile ? 32 : 32,
    confColWidth: isMobile ? 50 : 200,
    dataColWidth: isMobile ? 50 : 70,
    cellHeight: isMobile ? 32 : 36,
    headerHeight: isMobile ? 40 : 48,
  };

  return (
    <div className={`${CARD_CLASS} mb-3 p-2`}>
      {/* Table Container. Keeps its own collapsed 1px borders rather than the
          §5 border-spacing tile grid: every sticky offset (top: -1,
          left: expandColWidth - 1, ...) is measured against collapsed borders,
          and §6 warns how easily those seals break. */}
      <div
        role="region"
        aria-label="Non-conference opponent analysis. Scroll to see every column."
        tabIndex={0}
        className="focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-[rgb(14_116_144/0.35)]"
        style={{
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "80vh",
          position: "relative",
          borderRadius: "1rem",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: "max-content",
            borderSpacing: 0,
          }}
        >
          <thead>
            <HeaderRows sizes={sizes} onSort={handleSort} sortIndicator={sortIndicator} />
          </thead>
          <tbody>
            {sortConferences(tableData, sortField, sortOrder).map((row) => {
              const isExpanded = expandedConferences.has(row.team_conf);
              const hasTeams = row.teams && row.teams.length > 0;
              const sortedTeams = hasTeams ? sortTeams(row.teams, sortField, sortOrder) : [];
              return [
                <ConferenceRow
                  key={`conf-${row.team_conf}`}
                  row={row}
                  isExpanded={isExpanded}
                  onToggle={() => toggleConference(row.team_conf)}
                  ranges={ranges}
                  sizes={sizes}
                />,
                ...(isExpanded && hasTeams
                  ? sortedTeams.map((team) => (
                      <TeamRow
                        key={`team-${row.team_conf}-${team.team_name}`}
                        team={team}
                        ranges={ranges}
                        sizes={sizes}
                      />
                    ))
                  : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default memo(BballNonConfAnalysisTable);
