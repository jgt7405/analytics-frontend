export interface SiteStatisticsResponse {
  period: string;
  timezone: string;
  filters: { sport: string; scope: string };
  charts: {
    past_hour: StatisticsBucket[];
    past_7_days: StatisticsBucket[];
    past_30_days: StatisticsBucket[];
    monthly_24: StatisticsBucket[];
  };
  summary_windows: Record<string, number>;
  summary: {
    page_views: number;
    filter_changes: number;
    pages: number;
    conferences: number;
    teams: number;
    first_event: string | null;
    latest_event: string | null;
  };
  visitors: {
    unique_visitors: number;
    new_visitors: number;
    returning_visitors: number;
  };
  visitor_daily: Array<{
    date: string;
    unique_visitors: number;
    new_visitors: number;
    returning_visitors: number;
  }>;
  daily: Array<{ date: string; page_views: number }>;
  page_series: Array<{
    date: string;
    path: string;
    sport: string | null;
    page: string | null;
    page_views: number;
  }>;
  hourly: Array<{ hour: number; page_views: number }>;
  pages: Array<{ path: string; sport: string | null; page: string | null; views: number }>;
  conferences: Array<{ conference: string; selections: number }>;
  teams: Array<{ team: string; sport: string | null; views: number }>;
  sports: Array<{ sport: string; views: number }>;
}

export interface StatisticsBucket {
  bucket: string;
  views: number;
  total_visitors: number;
  unique_visitors: number;
}

export interface SiteUsageEvent {
  event_type: "page_view" | "filter_change";
  path: string;
  sport?: "basketball" | "football" | null;
  page?: string | null;
  conference?: string | null;
  team?: string | null;
  visitor_id?: string;
  session_id?: string;
}
