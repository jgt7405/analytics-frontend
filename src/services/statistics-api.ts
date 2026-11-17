import { apiUrl } from "@/api/urls";
import type { SiteStatisticsResponse, SiteUsageEvent } from "@/types/statistics";

export async function getSiteStatistics(days: string, sport: string, scope: string): Promise<SiteStatisticsResponse> {
  const response = await fetch(
    apiUrl("basketball.statisticsAnalysis", {}, { days, sport, scope }),
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
  }).catch(() => undefined);
}
