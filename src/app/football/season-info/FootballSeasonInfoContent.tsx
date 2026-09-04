"use client";

import FootballSeasonHighlightsTable from "@/components/features/football/FootballSeasonHighlightsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { FootballSeasonHighlightsResponse } from "@/types/football";
import { useEffect, useState } from "react";

const TITLE_CLASS =
  "text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300";

export default function FootballSeasonInfoContent() {
  const [data, setData] = useState<FootballSeasonHighlightsResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        <div className="space-y-6">
          <FootballSeasonHighlightsTable
            title="Biggest Upsets"
            description="Teams that won despite having the lowest win probability in that matchup."
            probLabel="Win Prob"
            rows={data?.upsets ?? []}
          />

          <FootballSeasonHighlightsTable
            title="Best Wins"
            description="Wins over opponents so tough that a #12-rated team would have had a low win probability against them."
            probLabel="#12 Win Prob"
            rows={data?.best_wins ?? []}
          />

          <FootballSeasonHighlightsTable
            title="Worst Losses"
            description="Losses to opponents so weak that a #12-rated team would have been heavily favored against them."
            probLabel="#12 Win Prob"
            rows={data?.worst_losses ?? []}
          />
        </div>
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
