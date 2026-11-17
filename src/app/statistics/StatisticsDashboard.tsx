"use client";

import "@/lib/chartjs-setup";
import { useMemo, useState } from "react";
import type { ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useSiteStatistics } from "@/hooks/useSiteStatistics";

const PERIODS = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["365", "1 year"], ["all", "All time"]] as const;
const GRANULARITIES = [["day", "Day"], ["week", "Week"], ["month", "Month"], ["year", "Year"]] as const;
const formatNumber = new Intl.NumberFormat("en-US");
type Granularity = (typeof GRANULARITIES)[number][0];

function hourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return `${hour % 12} ${hour < 12 ? "AM" : "PM"}`;
}

function pageName(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function bucketDate(value: string, granularity: Granularity) {
  const date = new Date(`${value}T12:00:00`);
  if (granularity === "year") return String(date.getFullYear());
  if (granularity === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  if (granularity === "week") {
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    return date.toISOString().slice(0, 10);
  }
  return value;
}

function Bar({ value, max }: { value: number; max: number }) {
  return <div className="h-2.5 min-w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-blue-500" style={{ width: `${max ? Math.max((value / max) * 100, 2) : 0}%` }} /></div>;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">{formatNumber.format(value)}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p></div>;
}

function Ranking({ title, subtitle, rows }: { title: string; subtitle: string; rows: Array<{ label: string; detail?: string | null; value: number }> }) {
  const max = Math.max(0, ...rows.map((row) => row.value));
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p><div className="mt-5 max-h-96 space-y-4 overflow-y-auto pr-2">{rows.map((row) => <div key={`${row.label}-${row.detail ?? ""}`} className="grid grid-cols-[minmax(7rem,12rem)_1fr_3.5rem] items-center gap-3 text-sm"><div className="min-w-0"><p className="truncate font-medium text-slate-700 dark:text-slate-200">{row.label}</p>{row.detail && <p className="truncate text-xs capitalize text-slate-500">{row.detail}</p>}</div><Bar value={row.value} max={max} /><span className="text-right font-semibold text-slate-700 dark:text-slate-200">{formatNumber.format(row.value)}</span></div>)}{!rows.length && <p className="text-sm text-slate-500">No activity recorded in this period.</p>}</div></section>;
}

const controlClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800";

export default function StatisticsDashboard() {
  const [period, setPeriod] = useState("30");
  const [sport, setSport] = useState("all");
  const [pageGroup, setPageGroup] = useState("all");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const { data, isLoading, error } = useSiteStatistics(period);

  const availablePages = useMemo(() => (data?.pages ?? []).filter((row) => (sport === "all" || row.sport === sport) && (pageGroup === "all" || (row.page ?? "other") === pageGroup)), [data, sport, pageGroup]);
  const pageGroups = useMemo(() => Array.from(new Set((data?.pages ?? []).filter((row) => sport === "all" || row.sport === sport).map((row) => row.page ?? "other"))).sort(), [data, sport]);
  const activePaths = useMemo(() => new Set(selectedPaths.length ? selectedPaths : availablePages.map((row) => row.path)), [selectedPaths, availablePages]);
  const filteredSeries = useMemo(() => (data?.page_series ?? []).filter((row) => (sport === "all" || row.sport === sport) && activePaths.has(row.path)), [data, sport, activePaths]);
  const timeline = useMemo(() => {
    const totals = new Map<string, number>();
    filteredSeries.forEach((row) => { const key = bucketDate(row.date, granularity); totals.set(key, (totals.get(key) ?? 0) + row.page_views); });
    return Array.from(totals, ([date, views]) => ({ date, views })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSeries, granularity]);
  const filteredPages = useMemo(() => availablePages.filter((row) => activePaths.has(row.path)), [availablePages, activePaths]);
  const filteredViews = timeline.reduce((sum, row) => sum + row.views, 0);
  const filteredTeams = (data?.teams ?? []).filter((row) => sport === "all" || row.sport === sport);
  const hourlyMax = Math.max(0, ...(data?.hourly.map((row) => row.page_views) ?? []));
  const chartData = { labels: timeline.map((row) => row.date), datasets: [{ label: "Page views", data: timeline.map((row) => row.views), borderColor: "rgb(8, 145, 178)", backgroundColor: "rgba(8, 145, 178, 0.14)", fill: true, tension: 0.25, pointRadius: timeline.length > 60 ? 0 : 3, pointHoverRadius: 5 }] };
  const visitorChartData = { labels: (data?.visitor_daily ?? []).map((row) => row.date), datasets: [{ label: "Unique", data: (data?.visitor_daily ?? []).map((row) => row.unique_visitors), borderColor: "rgb(8, 145, 178)", backgroundColor: "rgba(8, 145, 178, 0.1)", tension: 0.25 }, { label: "New", data: (data?.visitor_daily ?? []).map((row) => row.new_visitors), borderColor: "rgb(34, 197, 94)", backgroundColor: "rgba(34, 197, 94, 0.1)", tension: 0.25 }, { label: "Returning", data: (data?.visitor_daily ?? []).map((row) => row.returning_visitors), borderColor: "rgb(124, 58, 237)", backgroundColor: "rgba(124, 58, 237, 0.1)", tension: 0.25 }] };
  const chartOptions: ChartOptions<"line"> = { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${formatNumber.format(Number(context.parsed.y))} views` } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 14, maxRotation: 0 } } } };
  const visitorChartOptions: ChartOptions<"line"> = { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatNumber.format(Number(context.parsed.y))}` } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 14, maxRotation: 0 } } } };

  function togglePath(path: string) {
    const base = selectedPaths.length ? selectedPaths : availablePages.map((row) => row.path);
    setSelectedPaths(base.includes(path) ? base.filter((item) => item !== path) : [...base, path]);
  }

  return <PageLayoutWrapper title="Site Statistics" isLoading={isLoading} hideTitle><section className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">Anonymous usage dashboard</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">JThom Analytics Statistics</h1><p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Filter by sport and page, then change the chart interval to explore usage patterns.</p></div><label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">Date range<select value={period} onChange={(event) => setPeriod(event.target.value)} className={controlClass}>{PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {isLoading && <TableSkeleton rows={8} cols={5} />}
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Unable to load site statistics.</div>}
    {data && <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Sport<select value={sport} onChange={(event) => { setSport(event.target.value); setPageGroup("all"); setSelectedPaths([]); }} className={`mt-1 block w-full ${controlClass}`}><option value="all">All sports</option><option value="basketball">Basketball</option><option value="football">Football</option><option value="other">Other</option></select></label>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Page group<select value={pageGroup} onChange={(event) => { setPageGroup(event.target.value); setSelectedPaths([]); }} className={`mt-1 block w-full ${controlClass}`}><option value="all">All page groups</option>{pageGroups.map((group) => <option key={group} value={group}>{pageName(group)}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Chart interval<select value={granularity} onChange={(event) => setGranularity(event.target.value as Granularity)} className={`mt-1 block w-full ${controlClass}`}>{GRANULARITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Page selection<button type="button" onClick={() => setSelectedPaths([])} className="mt-1 block w-full rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-left text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">Use all {availablePages.length} matching pages</button></div>
        </div>
        <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-cyan-700 dark:text-cyan-300">Choose individual pages ({selectedPaths.length || availablePages.length} selected)</summary><div className="mt-3 grid max-h-56 gap-2 overflow-y-auto rounded-xl bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-3 dark:bg-slate-800/60">{availablePages.map((row) => <label key={row.path} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={activePaths.has(row.path)} onChange={() => togglePath(row.path)} className="rounded border-slate-300 text-cyan-600"/><span className="truncate">{row.path}</span></label>)}</div></details>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Unique visitors" value={data.visitors?.unique_visitors ?? 0} detail="Anonymous browsers in this period" /><Metric label="New visitors" value={data.visitors?.new_visitors ?? 0} detail="First seen during this period" /><Metric label="Returning visitors" value={data.visitors?.returning_visitors ?? 0} detail="Browsers active on a later day" /><Metric label="Selected page views" value={filteredViews} detail={`${activePaths.size} page${activePaths.size === 1 ? "" : "s"} in chart`} /><Metric label="All page views" value={data.summary.page_views} detail="Across the selected date range" /><Metric label="Filter changes" value={data.summary.filter_changes} detail="Conference/filter selections" /><Metric label="Teams viewed" value={data.summary.teams} detail="Distinct team pages" /><Metric label="Pages viewed" value={data.summary.pages} detail="Distinct URLs" /></div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Visitors by day</h2><p className="mt-1 text-sm text-slate-500">Each anonymous browser counts once per Central Time calendar day. New on its first day; returning on later days.</p><div className="mt-5 h-80">{data.visitor_daily?.length ? <Line data={visitorChartData} options={visitorChartOptions} /> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Visitor history begins after anonymous visitor tracking is deployed.</div>}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-wrap items-baseline justify-between gap-2"><div><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Views over time</h2><p className="mt-1 text-sm text-slate-500">{sport === "all" ? "All sports" : pageName(sport)} · {pageGroup === "all" ? "all page groups" : pageName(pageGroup)} · by {granularity}</p></div><span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">{formatNumber.format(filteredViews)} total</span></div><div className="mt-5 h-80">{timeline.length ? <Line data={chartData} options={chartOptions} /> : <div className="flex h-full items-center justify-center text-sm text-slate-500">No page views match these filters.</div>}</div></section>
      <div className="grid gap-6 xl:grid-cols-2"><Ranking title="Selected pages" subtitle="Page views matching the chart filters" rows={filteredPages.map((row) => ({ label: row.path, detail: row.sport, value: row.views }))} /><Ranking title="Most-viewed teams" subtitle="Team pages for the selected sport" rows={filteredTeams.map((row) => ({ label: row.team, detail: row.sport, value: row.views }))} /><Ranking title="Conference interest" subtitle="Initial selections and filter changes" rows={data.conferences.map((row) => ({ label: row.conference, value: row.selections }))} /><Ranking title="Views by sport" subtitle="Basketball, football, and other pages" rows={data.sports.map((row) => ({ label: row.sport, value: row.views }))} /></div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Time of day</h2><p className="mt-1 text-sm text-slate-500">All page views in the date range · Central Time</p><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{data.hourly.map((row) => <div key={row.hour}><div className="mb-1 flex justify-between text-xs text-slate-500"><span>{hourLabel(row.hour)}</span><span>{row.page_views}</span></div><Bar value={row.page_views} max={hourlyMax} /></div>)}</div></section>
    </>}
  </section></PageLayoutWrapper>;
}
