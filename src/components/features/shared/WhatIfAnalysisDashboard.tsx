"use client";

import { useMemo } from "react";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";

export interface WhatIfAnalysisData {
  logging_started: boolean;
  summary: {
    submissions: number;
    unique_scenarios: number;
    total_picks: number;
    average_picks: number;
    conferences: number;
    latest_submission: string | null;
  };
  daily: Array<{ date: string; submissions: number; picks: number }>;
  hourly: Array<{ hour: number; submissions: number }>;
  conferences: Array<{ conference: string; submissions: number; picks: number }>;
  teams: Array<{ team_id: string; team_name: string; conference: string | null; picks: number }>;
  recent: Array<{
    id: number;
    submitted_at: string;
    conference: string;
    selection_count: number;
    result_source: "calculated" | "cache";
    calculation_ms: number | null;
  }>;
}

const PERIODS = [
  ["7", "7 days"], ["30", "30 days"], ["90", "90 days"],
  ["365", "1 year"], ["all", "All time"],
] as const;
const number = new Intl.NumberFormat("en-US");

function localDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value.replace(/([+-]\d{2})$/, "$1:00"));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(date);
}

function hourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return `${hour % 12} ${hour < 12 ? "AM" : "PM"}`;
}

function Bar({ value, max }: { value: number; max: number }) {
  return <div className="h-2.5 min-w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${max ? Math.max(value / max * 100, 2) : 0}%` }} />
  </div>;
}

function Card({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{value}</p>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
  </div>;
}

const panel = "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900";

export default function WhatIfAnalysisDashboard({
  sport, period, onPeriodChange, data, isLoading, error,
}: {
  sport: "Basketball" | "Football";
  period: string;
  onPeriodChange: (period: string) => void;
  data: WhatIfAnalysisData | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  const maxima = useMemo(() => ({
    daily: Math.max(0, ...(data?.daily.map((row) => row.submissions) ?? [])),
    hourly: Math.max(0, ...(data?.hourly.map((row) => row.submissions) ?? [])),
    conferences: Math.max(0, ...(data?.conferences.map((row) => row.submissions) ?? [])),
    teams: Math.max(0, ...(data?.teams.map((row) => row.picks) ?? [])),
  }), [data]);

  return <PageLayoutWrapper title={`${sport} What-If Scenario Analytics`} isLoading={isLoading} hideTitle>
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Usage dashboard</p>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.035em] text-slate-800 dark:text-slate-100">{sport} What-If Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Understand when scenarios are submitted, which conferences draw attention, and which teams users pick to win.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">Date range
          <select value={period} onChange={(event) => onPeriodChange(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {isLoading && <TableSkeleton rows={8} cols={5} />}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">Unable to load what-if analytics. Please try again shortly.</div>}
      {data && !data.logging_started && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Scenario logging is ready, but no non-empty {sport.toLowerCase()} submissions have been recorded yet.</div>}

      {data?.logging_started && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Card label="Submissions" value={number.format(data.summary.submissions)} detail="Completed what-if requests" />
          <Card label="Unique scenarios" value={number.format(data.summary.unique_scenarios)} detail="Distinct combinations of picks" />
          <Card label="Total picks" value={number.format(data.summary.total_picks)} detail={`${data.summary.average_picks} picks per submission`} />
          <Card label="Conferences" value={number.format(data.summary.conferences)} detail="Conferences analyzed" />
          <Card label="Latest activity" value={localDateTime(data.summary.latest_submission)} detail="Central Time" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className={panel}><h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Submissions by day</h2><div className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-2">
            {data.daily.slice(-30).reverse().map((row) => <div key={row.date} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm"><span>{row.date.slice(5)}</span><Bar value={row.submissions} max={maxima.daily} /><span className="text-right font-semibold">{row.submissions}</span></div>)}
            {!data.daily.length && <p className="text-sm text-slate-500">No submissions in this period.</p>}
          </div></section>
          <section className={panel}><h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Time of day</h2><div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
            {data.hourly.map((row) => <div key={row.hour}><div className="mb-1 flex justify-between text-xs text-slate-500"><span>{hourLabel(row.hour)}</span><span>{row.submissions}</span></div><Bar value={row.submissions} max={maxima.hourly} /></div>)}
          </div></section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className={panel}><h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Conferences</h2><div className="mt-5 space-y-4">
            {data.conferences.map((row) => <div key={row.conference} className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-sm"><span className="truncate font-medium">{row.conference}</span><Bar value={row.submissions} max={maxima.conferences} /><span className="text-slate-500">{row.submissions} / {row.picks} picks</span></div>)}
          </div></section>
          <section className={panel}><h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Most-picked winners</h2><div className="mt-5 max-h-96 space-y-4 overflow-y-auto pr-2">
            {data.teams.map((row) => <div key={row.team_id} className="grid grid-cols-[minmax(7rem,11rem)_1fr_3rem] items-center gap-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{row.team_name}</p><p className="truncate text-xs text-slate-500">{row.conference || "Unknown conference"}</p></div><Bar value={row.picks} max={maxima.teams} /><span className="text-right font-semibold">{row.picks}</span></div>)}
          </div></section>
        </div>

        <section className={`${panel} p-0`}><div className="p-5"><h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Recent submissions</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800/70"><tr><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Conference</th><th className="px-5 py-3">Picks</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Calculation</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.recent.map((row) => <tr key={row.id}><td className="px-5 py-3">{localDateTime(row.submitted_at)}</td><td className="px-5 py-3 font-medium">{row.conference}</td><td className="px-5 py-3">{row.selection_count}</td><td className="px-5 py-3 capitalize">{row.result_source}</td><td className="px-5 py-3">{row.calculation_ms === null ? "—" : `${number.format(row.calculation_ms)} ms`}</td></tr>)}
        </tbody></table></div></section>
      </>}
    </section>
  </PageLayoutWrapper>;
}
