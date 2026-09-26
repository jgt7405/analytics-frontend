"use client";

import SeasonHighlightsTable from "@/components/common/SeasonHighlightsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type {
  SeasonHighlightGame,
  SeasonHighlightsResponse,
} from "@/types/seasonHighlights";
import { useEffect, useMemo, useState } from "react";
import { proxyUrl } from "@/lib/proxy-url";
import { logger } from "@/lib/logger";

const TITLE_CLASS =
  "text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300";

const ALL_TEAMS = "All Teams";

type DivisionFilter = "all" | "power" | "nonPower";

const DIVISION_OPTIONS: { value: DivisionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "power", label: "Power" },
  { value: "nonPower", label: "Non-Power" },
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
  "Big East",
  "Big Ten",
  "Southeastern",
];

// team_conf_catg from bball_team_schedule: the five conferences above are
// "Power", everyone else "Non Power".
function getDivision(row: SeasonHighlightGame): DivisionFilter {
  if (row.team_conf_catg === "Power") return "power";
  if (row.team_conf_catg === "Non Power") return "nonPower";
  return "all";
}

export default function BasketballSeasonInfoContent() {
  const [data, setData] = useState<SeasonHighlightsResponse | null>(
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
        const response = await fetch(proxyUrl("basketball/season_highlights"));
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        const json = (await response.json()) as SeasonHighlightsResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        logger.error("Error loading season highlights:", err);
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

  const applyFilters = (rows: SeasonHighlightGame[]) =>
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
              htmlFor="bball-season-info-conference"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Conference:
            </label>
            <select
              id="bball-season-info-conference"
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
          <SeasonHighlightsTable
            title="Biggest Upsets"
            description="Wins where team had the lowest win probability for that game."
            probLabel="Win Prob"
            rows={applyFilters(data?.upsets ?? [])}
            exportClassName="season-highlights-upsets"
            pageName="basketball-season-upsets"
          />

          <SeasonHighlightsTable
            title="Best Wins"
            description="Wins where the #50-rated team would have the lowest win probability if they played in that game."
            probLabel="#50 Win Prob"
            rows={applyFilters(data?.best_wins ?? [])}
            exportClassName="season-highlights-best-wins"
            pageName="basketball-season-best-wins"
          />

          <SeasonHighlightsTable
            title="Worst Losses"
            description="Losses where the #50-rated team would have the highest win probability if they played in that game."
            probLabel="#50 Win Prob"
            rows={applyFilters(data?.worst_losses ?? [])}
            exportClassName="season-highlights-worst-losses"
            pageName="basketball-season-worst-losses"
          />
        </div>
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
