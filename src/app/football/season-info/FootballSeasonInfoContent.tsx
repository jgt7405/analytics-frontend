"use client";

import FootballSeasonHighlightsTable from "@/components/features/football/FootballSeasonHighlightsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type {
  FootballSeasonHighlightGame,
  FootballSeasonHighlightsResponse,
} from "@/types/football";
import { useEffect, useMemo, useState } from "react";

const TITLE_CLASS =
  "text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300";

const ALL_TEAMS = "All Teams";

type DivisionFilter = "all" | "power4" | "g6";

const DIVISION_OPTIONS: { value: DivisionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "power4", label: "Power 4" },
  { value: "g6", label: "Group of 6" },
];

type DateRangeFilter = "7" | "14" | "28" | "all";

const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: "7", label: "Past 7 Days" },
  { value: "14", label: "Past 14 Days" },
  { value: "28", label: "Past 28 Days" },
  { value: "all", label: "Full Season" },
];

const PRIORITY_CONFERENCES = [
  "Atlantic Coast",
  "Big 12",
  "Big Ten",
  "Independent",
  "Southeastern",
];

// Manual overrides for this page only - Notre Dame (Independent) and UConn
// (Big East, a non-football conference for it) don't carry a clean Power
// 4 / Group of 6 label from team_conf_catg the way conference members do.
const DIVISION_OVERRIDES: Record<string, DivisionFilter> = {
  "notre dame": "power4",
  uconn: "g6",
  connecticut: "g6",
};

function getDivision(row: FootballSeasonHighlightGame): DivisionFilter {
  const override = DIVISION_OVERRIDES[row.team.trim().toLowerCase()];
  if (override) return override;
  if (row.team_conf_catg === "Power 4") return "power4";
  if (row.team_conf_catg === "Non Power 4") return "g6";
  return "all";
}

export default function FootballSeasonInfoContent() {
  const [data, setData] = useState<FootballSeasonHighlightsResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>("all");
  const [conferenceFilter, setConferenceFilter] = useState<string>(ALL_TEAMS);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("all");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/proxy/football/season_highlights");
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        const json = (await response.json()) as FootballSeasonHighlightsResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        console.error("Error loading season highlights:", err);
        if (!cancelled) {
          setError("Failed to load season info. Please try again later.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const conferenceOptions = useMemo(() => {
    if (!data) return [];
    const all = [...data.upsets, ...data.best_wins, ...data.worst_losses];
    const unique = Array.from(
      new Set(all.map((row) => row.team_conf).filter(Boolean)),
    );
    return unique.sort((a, b) => {
      const aIndex = PRIORITY_CONFERENCES.indexOf(a);
      const bIndex = PRIORITY_CONFERENCES.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [data]);

  // "Past N days" cuts off at local midnight N-1 days ago, so "today" always
  // counts as inside every range. null means no date filtering (Full Season).
  const dateCutoff = useMemo(() => {
    if (dateRangeFilter === "all") return null;
    const days = Number(dateRangeFilter);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    return cutoff.getTime();
  }, [dateRangeFilter]);

  const applyFilters = (rows: FootballSeasonHighlightGame[]) =>
    rows.filter((row) => {
      if (divisionFilter !== "all" && getDivision(row) !== divisionFilter) {
        return false;
      }
      if (conferenceFilter !== ALL_TEAMS && row.team_conf !== conferenceFilter) {
        return false;
      }
      if (dateCutoff != null) {
        const rowTime = row.date_iso ? new Date(row.date_iso).getTime() : NaN;
        if (Number.isNaN(rowTime) || rowTime < dateCutoff) return false;
      }
      return true;
    });

  if (isLoading) {
    return (
      <PageLayoutWrapper title="Season Info" hideTitle isLoading={true}>
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </PageLayoutWrapper>
    );
  }

  return (
    <PageLayoutWrapper title="Season Info" hideTitle isLoading={false}>
      <ErrorBoundary level="page">
        <h1 className={`${TITLE_CLASS} mb-4`}>Season Info</h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Division:
            </label>
            <div className="flex flex-wrap gap-2">
              {DIVISION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDivisionFilter(option.value)}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                    divisionFilter === option.value
                      ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
                      : "bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="season-info-conference"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Conference:
            </label>
            <select
              id="season-info-conference"
              value={conferenceFilter}
              onChange={(e) => setConferenceFilter(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[rgb(0,151,178)]"
            >
              <option value={ALL_TEAMS}>{ALL_TEAMS}</option>
              {conferenceOptions.map((conf) => (
                <option key={conf} value={conf}>
                  {conf}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Range:
            </label>
            <div className="flex flex-wrap gap-2">
              {DATE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRangeFilter(option.value)}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                    dateRangeFilter === option.value
                      ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
                      : "bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <FootballSeasonHighlightsTable
            title="Biggest Upsets"
            description="Teams that won despite having the lowest win probability in that matchup."
            probLabel="Win Prob"
            rows={applyFilters(data?.upsets ?? [])}
            exportClassName="season-highlights-upsets"
            pageName="football-season-upsets"
          />

          <FootballSeasonHighlightsTable
            title="Best Wins"
            description="Wins over opponents so tough that a #12-rated team would have had a low win probability against them."
            probLabel="#12 Win Prob"
            rows={applyFilters(data?.best_wins ?? [])}
            exportClassName="season-highlights-best-wins"
            pageName="football-season-best-wins"
          />

          <FootballSeasonHighlightsTable
            title="Worst Losses"
            description="Losses to opponents so weak that a #12-rated team would have been heavily favored against them."
            probLabel="#12 Win Prob"
            rows={applyFilters(data?.worst_losses ?? [])}
            exportClassName="season-highlights-worst-losses"
            pageName="football-season-worst-losses"
          />
        </div>
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
