"use client";

import FootballCompositeRatingsTable from "@/components/features/football/FootballCompositeRatingsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  useFootballCompositeRatingDates,
  useFootballCompositeRatings,
} from "@/hooks/useFootballCompositeRatings";
import { useState } from "react";

export default function FootballCompositeRatingsContent() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const { data, isLoading } = useFootballCompositeRatings(
    selectedDate || undefined,
  );
  const { data: datesData } = useFootballCompositeRatingDates();

  const teams = data?.teams ?? [];
  const lastUpdated = data?.last_updated
    ? new Date(data.last_updated).toLocaleDateString()
    : null;


  const minDate = datesData?.dates?.length
    ? datesData.dates[datesData.dates.length - 1]
    : undefined;
  const maxDate = datesData?.dates?.length ? datesData.dates[0] : undefined;

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title="Composite Football Ratings"
        hideTitle
        isLoading={isLoading}
        rightElement={lastUpdated ? `Updated: ${lastUpdated}` : undefined}
      >
        <div className="-mt-2 md:-mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <h2 className="text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
              Composite Football Ratings
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="composite-rating-date" className="text-gray-600 dark:text-gray-300">
                View as of:
              </label>
              <input
                id="composite-rating-date"
                type="date"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 dark:border-gray-600"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Back to current
                </button>
              )}
            </div>
          </div>

          <div className="mb-6 text-xs text-gray-600 dark:text-gray-300" style={{ lineHeight: "1.3" }}>
            Composite of 10 independent college football rating systems, z-scored
            and averaged. Composite Rtg % is a 0-100 display scaling of the
            underlying z-score (top team = 100, bottom = 0) - relative to the
            current team pool, not directly comparable across different weeks.
            See composite_methodology.md for the full methodology.
          </div>

          <FootballCompositeRatingsTable teams={teams} sources={data?.sources ?? []} />
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
