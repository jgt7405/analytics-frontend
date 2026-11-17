"use client";

import "@/lib/chartjs-setup";
import { useMemo, useState } from "react";
import type { ChartOptions } from "chart.js";
import { Bar as BarChart, Line } from "react-chartjs-2";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useSiteStatistics } from "@/hooks/useSiteStatistics";
import type { StatisticsBucket } from "@/types/statistics";

type Metric = "views" | "total_visitors" | "unique_visitors";
type Scope = "current" | "archive" | "all";

const METRICS: Array<[Metric, string]> = [
  ["views", "Views"],
  ["total_visitors", "Total visitors"],
  ["unique_visitors", "Unique visitors"],
];
const SPORTS = [["all", "All pages"], ["basketball", "Basketball"], ["football", "Football"], ["other", "Other"]] as const;
const SCOPES: Array<[Scope, string]> = [["current", "Current"], ["archive", "Archive"], ["all", "Both"]];
const DETAIL_PERIODS = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["365", "1 year"], ["all", "All time"]] as const;
const selectClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium dark:border-slate-600 dark:bg-slate-800";

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

function DetailTable({ title, rows }: { title: string; rows: Array<{ label: string; value: number; detail?: string | null }> }) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700"><h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h2></div><div className="max-h-80 overflow-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th className="px-3 py-2 text-left font-semibold">Name</th><th className="px-3 py-2 text-right font-semibold">Count</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.label}-${row.detail ?? ""}`} className="border-t border-slate-100 dark:border-slate-800"><td className="max-w-56 truncate px-3 py-1.5 text-slate-700 dark:text-slate-200" title={row.label}>{row.label}{row.detail && <span className="ml-1 text-[10px] capitalize text-slate-400">{row.detail}</span>}</td><td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">{row.value.toLocaleString()}</td></tr>)}{!rows.length && <tr><td colSpan={2} className="px-3 py-6 text-center text-slate-500">No data</td></tr>}</tbody></table></div></section>;
}

export default function StatisticsDashboard() {
  const [metric, setMetric] = useState<Metric>("views");
  const [sport, setSport] = useState("all");
  const [scope, setScope] = useState<Scope>("all");
  const [detailPeriod, setDetailPeriod] = useState("30");
  const { data, isLoading, error } = useSiteStatistics(detailPeriod, sport, scope);
  const comparison = useMemo(() => monthlyComparison(data?.charts?.monthly_24 ?? [], metric), [data, metric]);
  const comparisonData = { labels: comparison.current.map((point) => point.label), datasets: [{ label: "Last 12 months", data: comparison.current.map((point) => point.value), borderColor: "rgb(8, 145, 178)", backgroundColor: "rgba(8, 145, 178, 0.12)", tension: 0.25 }, { label: "Prior 12 months", data: comparison.prior.map((point) => point.value), borderColor: "rgb(100, 116, 139)", backgroundColor: "rgba(100, 116, 139, 0.08)", borderDash: [6, 5], tension: 0.25 }] };
  const lineOptions: ChartOptions<"line"> = { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxRotation: 0 } } } };

  return <PageLayoutWrapper title="Site Statistics" isLoading={isLoading} hideTitle><section className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Site Statistics</h1><div className="flex flex-wrap gap-3"><select aria-label="Sport" value={sport} onChange={(event) => setSport(event.target.value)} className={selectClass}>{SPORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><div className="inline-flex rounded-lg border border-slate-300 p-1 dark:border-slate-600">{SCOPES.map(([value, label]) => <button key={value} type="button" onClick={() => setScope(value)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${scope === value ? "bg-cyan-700 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{label}</button>)}</div></div></div>
    <div className="flex flex-wrap gap-2">{METRICS.map(([value, label]) => <button key={value} type="button" onClick={() => setMetric(value)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${metric === value ? "bg-cyan-700 text-white shadow-sm" : "border border-slate-300 bg-white text-slate-700 hover:border-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"}`}>{label}</button>)}</div>
    {isLoading && <TableSkeleton rows={8} cols={5} />}
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Unable to load site statistics.</div>}
    {data?.charts && <>
      <BarPanel title="Past hour" rows={data.charts.past_hour} metric={metric} count={60} unit="minute" />
      <BarPanel title="Past 7 days" rows={data.charts.past_7_days} metric={metric} count={7} unit="day" />
      <BarPanel title="Past 30 days" rows={data.charts.past_30_days} metric={metric} count={30} unit="day" />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Last 12 months vs prior 12 months</h2><div className="mt-4 h-80"><Line data={comparisonData} options={lineOptions} /></div></section>
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Details</h2><select aria-label="Detail time period" value={detailPeriod} onChange={(event) => setDetailPeriod(event.target.value)} className={selectClass}>{DETAIL_PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="grid gap-3 lg:grid-cols-3"><DetailTable title="Pages" rows={data.pages.map((row) => ({ label: row.path, value: row.views, detail: row.sport }))} /><DetailTable title="Teams" rows={data.teams.map((row) => ({ label: row.team, value: row.views, detail: row.sport }))} /><DetailTable title="Conferences" rows={data.conferences.map((row) => ({ label: row.conference, value: row.selections }))} /></div>
    </>}
  </section></PageLayoutWrapper>;
}
