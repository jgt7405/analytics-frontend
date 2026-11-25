export interface SiteStatisticsResponse {
  period: string;
  timezone: string;
  calendar_through?: string;
  next_calendar_rollover?: string;
  filters: { sport: string; scope: string };
  charts: {
    past_hour: StatisticsBucket[];
    past_24_hours?: StatisticsBucket[];
    past_7_days: StatisticsBucket[];
    past_30_days: StatisticsBucket[];
    today?: StatisticsBucket;
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
  // Traffic sources: counted per visit (first page view), from when source
  // tracking began. Optional until every backend deploy returns them.
  channels?: Array<{ channel: string; visits: number; visitors: number }>;
  sources?: Array<{ source: string; channel: string; visits: number; visitors: number }>;
  referrers?: Array<{
    referrer_url: string;
    source: string | null;
    channel: string | null;
    visits: number;
    visitors: number;
    top_landing_page: string | null;
    latest_visit: string | null;
  }>;
  campaigns?: Array<{
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    visits: number;
    visitors: number;
  }>;
  landing_pages?: Array<{ path: string; visits: number }>;
}

export interface StatisticsBucket {
  bucket: string;
  views: number;
  total_visitors: number;
  unique_visitors: number;
}

export type SiteUsageEventType = "page_view" | "filter_change" | "page_exit" | "feature" | "web_vital" | "error" | "outbound" | "compare";

export interface SiteUsageEvent {
  event_type: SiteUsageEventType;
  path: string;
  sport?: "basketball" | "football" | null;
  page?: string | null;
  conference?: string | null;
  team?: string | null;
  visitor_id?: string;
  session_id?: string;
  entry?: boolean;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  // Page views: what kind of screen and app mode, the visitor's time zone,
  // whether the conference is the page's default rather than a choice, and
  // whether the browser is driven by a script (navigator.webdriver).
  device?: "mobile" | "tablet" | "desktop";
  display_mode?: "browser" | "standalone";
  time_zone?: string | null;
  conference_defaulted?: boolean;
  automated?: boolean;
  /** One page view; page_exit and the events on that page carry it too. */
  view_id?: string;
  // page_exit: visible time and furthest scroll on the page.
  engaged_ms?: number;
  scroll_pct?: number;
  // feature: control name; web_vital: metric name; error: kind;
  // compare: how the team was added ("pick" by hand, "rank" quick-select).
  detail?: string | null;
  // feature: extra text; error: message; outbound: the link followed.
  label?: string | null;
  metric_value?: number;
  /** compare: the teams on the page in selection order, ending with the one
   *  just added (src/hooks/useCompareTracking.ts). */
  teams?: string[];
}

/** What the tracker saw when a page view happened; the sender turns the first
 *  page view of a tab session into a visit's source (src/lib/visit-source.ts). */
export interface VisitContext {
  referrer: string;
  host: string;
  search: string;
}

// --- /statistics/insights: the page's second section --------------------------
// Rates and shares are 0–1 fractions; null where there is nothing to divide by.
// A "visit" is one browser-tab session.

type Metric3<T> = { views: T; total_visitors: T; unique_visitors: T };
export interface PeriodChange { current: number; previous: number; change_pct: number | null }
export interface PageChange { path?: string; team?: string; sport?: string | null; current: number; previous: number; change: number; change_pct: number | null }
export interface SourceQualityRow {
  channel?: string;
  source?: string;
  visits: number;
  visitors: number;
  bounce_rate: number;
  pages_per_visit: number;
  median_seconds: number;
  return_rate: number;
}
/** Sections fed by tracking added with this page: they start empty and
 *  report when their data begins. */
interface Tracked { since: string | null }

export interface SiteStatisticsInsights {
  period: string;
  timezone: string;
  generated_at: string;
  daily_views: Array<{ date: string; views: number }>;
  visits: {
    visits: number;
    pages_per_visit: number;
    bounce_rate: number;
    filter_changes_per_visit: number;
    interacting_share: number;
    median_seconds: number;
    median_seconds_engaged: number;
    pages_1: number; pages_2_3: number; pages_4_9: number; pages_10_plus: number;
    seconds_under_10: number; seconds_10_60: number; seconds_60_180: number;
    seconds_180_600: number; seconds_600_1800: number; seconds_1800_plus: number;
  };
  landing_pages: Array<{ path: string; visits: number; bounce_rate: number; pages_per_visit: number }>;
  exit_pages: Array<{ path: string; exits: number; views: number; exit_rate: number | null }>;
  page_flow: Array<{ from_page: string; to_page: string; transitions: number }>;
  interaction: Array<{ path: string; views: number; filter_changes: number; visits: number; interacting_visits: number }>;
  cohorts: Array<{ cohort: string; visitors: number; week_1: number | null; week_2: number | null; week_4: number | null; week_8: number | null }>;
  frequency: { visitors: number; visits_per_visitor: number; visits_1: number; visits_2_5: number; visits_6_20: number; visits_21_plus: number };
  stickiness: { daily_visitors: number; weekly_visitors: number; monthly_visitors: number; dau_mau: number | null; dau_wau: number | null };
  visitor_type_pages: Record<"new" | "returning", Array<{ path: string; views: number; share: number | null }>>;
  movers: { pages: { rising: PageChange[]; falling: PageChange[] }; teams: { rising: PageChange[]; falling: PageChange[] } } | null;
  heatmap: Array<{ weekday: number; hour: number; views: number }>;
  content_mix: { unit: "hour" | "day" | "week" | "month"; buckets: Array<{ bucket: string; basketball: number; football: number; other: number; archive: number; total: number }> };
  conference_pages: { pages: string[]; conferences: string[]; cells: number[][] };
  chosen_conferences: Array<{ conference: string; chosen: number; defaulted: number }>;
  game_day_lift: Array<{ team: string; sport: string; game_days: number; game_day_avg: number; other_day_avg: number; lift: number | null }>;
  spikes: Array<{ date: string; views: number; times_average: number | null; top_page: string | null; top_team: string | null; top_source: string | null }>;
  channel_quality: SourceQualityRow[];
  source_quality: SourceQualityRow[];
  referral_decay: Array<{ referrer_url: string; first_visit: string | null; hours: number[]; visits_48h: number; share_first_6h: number | null; share_first_24h: number | null }>;
  period_changes: Record<"hour" | "day" | "week" | "month" | "year", Metric3<PeriodChange>>;
  records: {
    best: Partial<Record<"hour" | "day" | "week" | "month", Partial<Metric3<{ bucket: string; value: number }>>>>;
    today: Partial<Metric3<number>>;
  };
  active_now: { visits?: number; visitors?: number; pages: Array<{ path: string; visits: number }> };
  devices: Tracked & {
    devices: Array<{ device: string; views: number; visits: number; visitors: number }>;
    display_modes: Array<{ display_mode: string; views: number; visits: number }>;
    installs: number;
  };
  engagement: Tracked & { overall: EngagementRow | Record<string, never>; pages: Array<EngagementRow & { path: string }> };
  features: Tracked & { features: Array<{ feature: string; uses: number; visitors: number; top_page: string | null }> };
  web_vitals: Tracked & {
    overall: Array<{ metric: string; samples: number; p75: number }>;
    pages: Array<{ path: string; metric: string; samples: number; p75: number }>;
  };
  errors: Tracked & {
    kinds: Array<{ kind: string; errors: number; visits: number }>;
    messages: Array<{ kind: string; message: string; path: string; errors: number; visits: number; latest: string }>;
    not_found: Array<{ path: string; hits: number; latest: string }>;
  };
  locations: Tracked & {
    countries: Array<{ country: string; views: number; visitors: number }>;
    us_regions: Array<{ region: string; views: number; visitors: number }>;
    time_zones: Array<{ time_zone: string; views: number; visitors: number }>;
  };
  bots: Tracked & {
    bot_views?: number; checked_views?: number; bot_visits?: number; checked_visits?: number;
    view_share: number | null; visit_share: number | null;
    pages: Array<{ path: string; views: number }>;
  };
  outbound: Tracked & { links: Array<{ host: string; url: string; clicks: number; visitors: number; top_page: string | null }> };
}

export interface EngagementRow {
  views: number;
  avg_engaged_ms: number | null;
  median_engaged_ms: number | null;
  avg_scroll_pct: number | null;
  scroll_25: number | null; scroll_50: number | null; scroll_75: number | null; scroll_90: number | null;
}
