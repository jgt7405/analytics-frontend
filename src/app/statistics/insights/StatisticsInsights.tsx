"use client";

import { useEffect, useRef, useState } from "react";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useSiteStatisticsInsights } from "@/hooks/useSiteStatisticsInsights";
import type { SiteStatisticsResponse } from "@/types/statistics";
import { ContentSection } from "./ContentSection";
import { EngagementSection } from "./EngagementSection";
import { HighlightsSection } from "./HighlightsSection";
import { RetentionSection } from "./RetentionSection";
import { SourcesSection } from "./SourcesSection";
import { TrackedSection } from "./TrackedSection";
import type { Metric } from "./ui";

export interface InsightFilters {
  days: string;
  sport: string;
  scope: string;
  dimension?: string;
  value?: string;
  dimension2?: string;
  value2?: string;
}

/** The statistics page's second section, below the original charts. It
 *  follows the page's filters and metric, and loads once scrolled near. */
export default function StatisticsInsights({ filters, metric, visitorDaily }: { filters: InsightFilters; metric: Metric; visitorDaily: SiteStatisticsResponse["visitor_daily"] }) {
  const anchor = useRef<HTMLDivElement>(null);
  // Without IntersectionObserver (very old browsers), load straight away.
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const element = anchor.current;
    if (!element || near) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setNear(true);
    }, { rootMargin: "800px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);
  const { data, isLoading, error } = useSiteStatisticsInsights(near, filters.days, filters.sport, filters.scope, filters.dimension, filters.value, filters.dimension2, filters.value2);

  return <div ref={anchor} className="space-y-2">
    {(!near || isLoading) && <TableSkeleton rows={6} cols={4} />}
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Unable to load the detailed statistics.</div>}
    {data && <>
      <HighlightsSection data={data} metric={metric} />
      <EngagementSection data={data} />
      <ContentSection data={data} />
      <SourcesSection data={data} />
      <RetentionSection data={data} visitorDaily={visitorDaily} />
      <TrackedSection data={data} />
    </>}
  </div>;
}
