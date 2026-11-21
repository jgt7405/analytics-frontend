"use client";

import "@/lib/chartjs-setup";
import { useMemo, useState } from "react";
import type { ChartOptions } from "chart.js";
import { Bar as BarChart, Line } from "react-chartjs-2";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";
import type { Sport } from "@/config/seasons";
import { useSiteStatistics } from "@/hooks/useSiteStatistics";
import { conferenceLogoPath, storedTeamName } from "@/lib/display-names";
import type { StatisticsBucket } from "@/types/statistics";
import { DetailTable, type Selection } from "./DetailTable";
import { TrafficSources } from "./TrafficSources";

type Metric = "views" | "total_visitors" | "unique_visitors";
type Scope = "current" | "archive" | "all";

const METRICS: Array<[Metric, string]> = [
  ["views", "Views"],
  ["total_visitors", "Total visitors"],
  ["unique_visitors", "Unique visitors"],
];
const SPORTS = [["all", "All pages"], ["basketball", "Basketball"], ["football", "Football"], ["other", "Other"]] as const;
const SCOPES: Array<[Scope, string]> = [["current", "Current"], ["archive", "Archive"], ["all", "Both"]];
const DETAIL_PERIODS = [["hour", "Past hour"], ["24h", "Past 24 hours"], ["yesterday", "Yesterday"], ["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["365", "1 year"], ["all", "All time"]] as const;
const SUMMARY_WINDOWS = [["year", "Past year"], ["month", "Past 30 days"], ["week", "Past 7 days"], ["day", "Past 24 hours"], ["hour", "Past hour"]] as const;
/** Per-period averages shown under each summary total (the past hour has none). */
const SUMMARY_AVERAGES: Partial<Record<(typeof SUMMARY_WINDOWS)[number][0], { divisor: number; unit: "hour" | "day" }>> = {
  day: { divisor: 24, unit: "hour" },
  week: { divisor: 7, unit: "day" },
  month: { divisor: 30, unit: "day" },
  year: { divisor: 365, unit: "day" },
};
const selectClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium dark:border-slate-600 dark:bg-slate-800";

function teamLogoPath(name: string, sport: string | null) {
  const storedName = sport === "basketball" || sport === "football"
    ? storedTeamName(sport as Sport, name)
    : name;
  return `/images/team_logos/${storedName.toLowerCase().replace(/\s+/g, "_")}.png`;
}

function keyForDate(date: Date, includeTime = false) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (!includeTime) return `${year}-${month}-${day}`;
  return `${year}-${month}-${day} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function fillRecentBuckets(rows: StatisticsBucket[], count: number, unit: "minute" | "day", metric: Metric) {
  const values = new Map(rows.map((row) => [row.bucket, row[metric]]));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    if (unit === "minute") {
      date.setSeconds(0, 0);
      date.setMinutes(date.getMinutes() - (count - 1 - index));
    } else {
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - (count - 1 - index));
    }
    const key = keyForDate(date, unit === "minute");
    return { key, label: unit === "minute" ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: values.get(key) ?? 0 };
  });
}

function monthlyComparison(rows: StatisticsBucket[], metric: Metric) {
  const values = new Map(rows.map((row) => [row.bucket, row[metric]]));
  const months = Array.from({ length: 24 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (23 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: date.toLocaleDateString("en-US", { month: "short" }), value: values.get(key) ?? 0 };
  });
  return { prior: months.slice(0, 12), current: months.slice(12) };
}

function BarPanel({ title, rows, metric, count, unit }: { title: string; rows: StatisticsBucket[]; metric: Metric; count: number; unit: "minute" | "day" }) {
  const points = fillRecentBuckets(rows, count, unit, metric);
  const data = { labels: points.map((point) => point.label), datasets: [{ label: METRICS.find(([value]) => value === metric)?.[1], data: points.map((point) => point.value), backgroundColor: "rgba(8, 145, 178, 0.72)", borderColor: "rgb(8, 145, 178)", borderWidth: 1, borderRadius: 3 }] };
  const options: ChartOptions<"bar"> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: unit === "minute" ? 12 : 15, maxRotation: 0 } } } };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2><div className="mt-4 h-72"><BarChart data={data} options={options} /></div></section>;
}

export default function StatisticsDashboard() {
  const [metric, setMetric] = useState<Metric>("views");
  const [sport, setSport] = useState("all");
  const [scope, setScope] = useState<Scope>("all");
  const [detailPeriod, setDetailPeriod] = useState("30");
  const [pageFilter, setPageFilter] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const { data, isLoading, error } = useSiteStatistics(detailPeriod, sport, scope);
  const { data: pageData } = useSiteStatistics(detailPeriod, sport, scope, pageFilter ? "page" : undefined, pageFilter ?? undefined);
  const primaryDimension = pageFilter ? "page" : selection?.dimension;
  const primaryValue = pageFilter ?? selection?.value;
  const secondaryDimension = pageFilter ? selection?.dimension : undefined;
  const secondaryValue = pageFilter ? selection?.value : undefined;
  const { data: trendData } = useSiteStatistics(detailPeriod, sport, scope, primaryDimension, primaryValue, secondaryDimension, secondaryValue);
  const chartSource = trendData ?? data;
  const conferenceRows = pageFilter
    ? (pageData?.conferences ?? [])
    : (data?.conferences ?? []);
  const comparison = useMemo(() => monthlyComparison(chartSource?.charts?.monthly_24 ?? [], metric), [chartSource, metric]);
  const comparisonData = { labels: comparison.current.map((point) => point.label), datasets: [{ label: "Last 12 months", data: comparison.current.map((point) => point.value), borderColor: "rgb(8, 145, 178)", backgroundColor: "rgba(8, 145, 178, 0.12)", tension: 0.25 }, { label: "Prior 12 months", data: comparison.prior.map((point) => point.value), borderColor: "rgb(100, 116, 139)", backgroundColor: "rgba(100, 116, 139, 0.08)", borderDash: [6, 5], tension: 0.25 }] };
  const lineOptions: ChartOptions<"line"> = { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxRotation: 0 } } } };

  return <PageLayoutWrapper title="Site Statistics" isLoading={isLoading} hideTitle><section className="-mt-6 space-y-2">
    <div className="flex flex-wrap items-center gap-2"><h1 className="mr-auto text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Site Statistics</h1>{METRICS.map(([value, label]) => <button key={value} type="button" onClick={() => setMetric(value)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${metric === value ? "bg-cyan-700 text-white shadow-sm" : "border border-slate-300 bg-white text-slate-700 hover:border-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"}`}>{label}</button>)}<select aria-label="Sport" value={sport} onChange={(event) => { setSport(event.target.value); setPageFilter(null); setSelection(null); }} className={selectClass}>{SPORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><div className="inline-flex rounded-lg border border-slate-300 p-1 dark:border-slate-600">{SCOPES.map(([value, label]) => <button key={value} type="button" onClick={() => { setScope(value); setPageFilter(null); setSelection(null); }} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${scope === value ? "bg-cyan-700 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{label}</button>)}</div><select aria-label="Detail time period" value={detailPeriod} onChange={(event) => setDetailPeriod(event.target.value)} className={selectClass}>{DETAIL_PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {(pageFilter || selection) && <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300"><span>Trends for:</span>{pageFilter && <span className="rounded-md bg-cyan-50 px-2 py-1 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100">Page: {pageFilter} <button type="button" onClick={() => setPageFilter(null)} className="ml-1 font-bold" aria-label="Clear page filter">×</button></span>}{selection && <span className="rounded-md bg-violet-50 px-2 py-1 text-violet-900 dark:bg-violet-950 dark:text-violet-100">{selection.dimension}: {selection.label} <button type="button" onClick={() => setSelection(null)} className="ml-1 font-bold" aria-label={`Clear ${selection.dimension} filter`}>×</button></span>}</div>}
    {isLoading && <TableSkeleton rows={8} cols={5} />}
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Unable to load site statistics.</div>}
    {chartSource?.summary_windows && <div className="flex flex-wrap gap-2">{SUMMARY_WINDOWS.map(([key, label]) => { const total = chartSource.summary_windows[`${key}_${metric}`] ?? 0; const average = SUMMARY_AVERAGES[key]; return <div key={key} className="min-w-[7.5rem] rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-[11px] font-semibold leading-tight text-slate-500 dark:text-slate-400">{label}</p><p className="text-xl font-bold leading-tight tabular-nums text-slate-900 dark:text-white">{total.toLocaleString()}</p>{average && <p className="text-[10px] leading-tight tabular-nums text-slate-400 dark:text-slate-500">{(total / average.divisor).toLocaleString("en-US", { maximumFractionDigits: 0 })} avg/{average.unit}</p>}</div>; })}</div>}
    {data?.charts && chartSource?.charts && <>
      <h2 className="!mt-1 text-lg font-bold leading-tight text-slate-800 dark:text-slate-100">Details</h2>
      <div className="grid gap-2 lg:grid-cols-3"><DetailTable title="Pages" dimension="page" selection={pageFilter ? { dimension: "page", value: pageFilter, label: pageFilter } : null} onSelect={(next) => { setPageFilter(next.value); setSelection(null); }} rows={data.pages.map((row) => ({ label: row.path === "/basketball/team/*" ? "Basketball team pages" : row.path === "/football/team/*" ? "Football team pages" : row.path, filterValue: row.path, value: row.views }))} /><DetailTable title="Teams" dimension="team" selection={selection} onSelect={(next) => { setPageFilter(null); setSelection(next); }} rows={data.teams.map((row) => ({ label: row.team, value: row.views, logoUrl: teamLogoPath(row.team, row.sport) }))} /><DetailTable title={pageFilter ? `Conferences · ${pageFilter}` : "Conferences"} dimension="conference" selection={selection} onSelect={setSelection} rows={conferenceRows.map((row) => ({ label: row.conference, value: row.selections, logoUrl: conferenceLogoPath(row.conference) }))} /></div>
      <TrafficSources data={pageFilter ? pageData : data} pageFilter={pageFilter} selection={selection} onSelect={setSelection} onSelectPage={(path) => { setPageFilter(path); setSelection(null); }} />
      <BarPanel title="Past hour" rows={chartSource.charts.past_hour} metric={metric} count={60} unit="minute" />
      <BarPanel title="Past 7 days" rows={chartSource.charts.past_7_days} metric={metric} count={7} unit="day" />
      <BarPanel title="Past 30 days" rows={chartSource.charts.past_30_days} metric={metric} count={30} unit="day" />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Last 12 months vs prior 12 months</h2><div className="mt-4 h-80"><Line data={comparisonData} options={lineOptions} /></div></section>
    </>}
  </section></PageLayoutWrapper>;
}
