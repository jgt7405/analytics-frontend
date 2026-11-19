import { apiUrl } from "@/api/urls";
import type { SiteStatisticsResponse, SiteUsageEvent } from "@/types/statistics";

export async function getSiteStatistics(days: string, sport: string, scope: string, dimension?: string, value?: string, dimension2?: string, value2?: string): Promise<SiteStatisticsResponse> {
  const response = await fetch(
    apiUrl("basketball.statisticsAnalysis", {}, { days, sport, scope, dimension, value, dimension2, value2 }),
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`Statistics request failed: ${response.status}`);
  return response.json() as Promise<SiteStatisticsResponse>;
}

export function sendSiteUsageEvent(event: SiteUsageEvent): void {
  void fetch(apiUrl("basketball.statisticsEvent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  })
    // Read the (tiny) reply: until its body is consumed, Chromium keeps the
    // request open, so the page never reaches network idle (each smoke test
    // then waited out its 10 s cap).
    .then((response) => response.text())
    .catch(() => undefined);
}
