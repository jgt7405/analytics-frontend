"use client";

import BasketballCompositeRatingsTable from "@/components/features/basketball/BasketballCompositeRatingsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useBasketballCompositeRatings } from "@/hooks/useBasketballCompositeRatings";

export default function BasketballCompositeRatingsContent() {
  const { data, isLoading } = useBasketballCompositeRatings();

  const teams = data?.teams ?? [];
  const sources = data?.sources ?? [];
  const totalSources = data?.total_sources ?? sources.length;

  // Parsed as a plain local date: these are date-only strings, and letting the
  // Date constructor read them as UTC shifts them a day back west of Greenwich.
  function formatDate(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = new Date(value + "T00:00:00");
    return isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  }

  const lastChanged = formatDate(data?.last_changed);
  const lastScraped = formatDate(data?.last_scraped);
  const headerDate = lastChanged ?? lastScraped;

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title="Composite Basketball Ratings"
        hideTitle
        isLoading={isLoading}
        rightElement={headerDate ? `Updated: ${headerDate}` : undefined}
      >
        <div className="-mt-2 md:-mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <h2 className="text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
              Composite Basketball Ratings
            </h2>
          </div>

          <div
            className="mb-6 text-xs text-gray-600 dark:text-gray-300"
            style={{ lineHeight: "1.3" }}
          >
            The composite rating behind every basketball projection on this site.
            KenPom is the anchor: Torvik and EvanMiya are each z-scored and mapped
            onto KenPom&apos;s mean and standard deviation (the &quot;Adj&quot;
            columns), and the composite is the average of KenPom and whichever
            adjusted ratings are available. Because it is built on KenPom&apos;s
            scale rather than in z-space, the composite reads as a net efficiency
            margin and needs no rescaling. It is the number the rest of the site
            calls NetRtg, and it drives the TWV baselines, game win probabilities,
            and NCAA tournament seeding.
          </div>

          {lastScraped ? (
            <div
              className="mb-6 -mt-4 text-xs text-gray-500 dark:text-gray-400"
              style={{ lineHeight: "1.3" }}
            >
              Ratings last changed {lastChanged ?? "—"}; last scraped{" "}
              {lastScraped}. All three sources are scraped together and written
              only if every one of them returns a full set of teams, so if the
              scraped date stops advancing the table below is showing older
              numbers.
            </div>
          ) : null}

          <BasketballCompositeRatingsTable
            teams={teams}
            sources={sources}
            totalSources={totalSources}
          />
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
