"use client";

import { useMemo, useState } from "react";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useSiteStatistics } from "@/hooks/useSiteStatistics";

const PERIODS = [
  ["7", "7 days"], ["30", "30 days"], ["90", "90 days"],
  ["365", "1 year"], ["all", "All time"],
] as const;
const formatNumber = new Intl.NumberFormat("en-US");

function hourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return `${hour % 12} ${hour < 12 ? "AM" : "PM"}`;
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2.5 min-w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-blue-500"
        style={{ width: `${max ? Math.max((value / max) * 100, 2) : 0}%` }} />
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">{formatNumber.format(value)}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function Ranking({ title, subtitle, rows }: {
  title: string;
  subtitle: string;
  rows: Array<{ label: string; detail?: string | null; value: number }>;
}) {
  const max = Math.max(0, ...rows.map((row) => row.value));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      <div className="mt-5 max-h-96 space-y-4 overflow-y-auto pr-2">
        {rows.map((row) => (
          <div key={`${row.label}-${row.detail ?? ""}`} className="grid grid-cols-[minmax(7rem,12rem)_1fr_3.5rem] items-center gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-700 dark:text-slate-200">{row.label}</p>
              {row.detail && <p className="truncate text-xs capitalize text-slate-500">{row.detail}</p>}
            </div>
            <Bar value={row.value} max={max} />
            <span className="text-right font-semibold text-slate-700 dark:text-slate-200">{formatNumber.format(row.value)}</span>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-slate-500">No activity recorded in this period.</p>}
      </div>
    </section>
  );
}

export default function StatisticsDashboard() {
  const [period, setPeriod] = useState("30");
  const { data, isLoading, error } = useSiteStatistics(period);
  const maxima = useMemo(() => ({
    daily: Math.max(0, ...(data?.daily.map((row) => row.page_views) ?? [])),
    hourly: Math.max(0, ...(data?.hourly.map((row) => row.page_views) ?? [])),
  }), [data]);

  return (
    <PageLayoutWrapper title="Site Statistics" isLoading={isLoading} hideTitle>
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">Anonymous usage dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">JThom Analytics Statistics</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">See which pages, conferences, and teams visitors explore. No IP addresses or visitor identities are stored.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            Date range
            <select value={period} onChange={(event) => setPeriod(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
              {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>

        {isLoading && <TableSkeleton rows={8} cols={5} />}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Unable to load site statistics.</div>}
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Page views" value={data.summary.page_views} detail="Pages loaded" />
              <Metric label="Filter changes" value={data.summary.filter_changes} detail="Conference/filter selections" />
              <Metric label="Pages viewed" value={data.summary.pages} detail="Distinct URLs" />
              <Metric label="Conferences" value={data.summary.conferences} detail="Distinct selections" />
              <Metric label="Teams viewed" value={data.summary.teams} detail="Distinct team pages" />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Ranking title="Most-viewed pages" subtitle="Page loads by URL"
                rows={data.pages.map((row) => ({ label: row.path, detail: row.sport, value: row.views }))} />
              <Ranking title="Conference interest" subtitle="Initial selections and filter changes"
                rows={data.conferences.map((row) => ({ label: row.conference, value: row.selections }))} />
              <Ranking title="Most-viewed teams" subtitle="Visits to individual team pages"
                rows={data.teams.map((row) => ({ label: row.team, detail: row.sport, value: row.views }))} />
              <Ranking title="Views by sport" subtitle="Basketball, football, and other pages"
                rows={data.sports.map((row) => ({ label: row.sport, value: row.views }))} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Views by day</h2>
                <div className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-2">
                  {data.daily.slice(-30).reverse().map((row) => <div key={row.date} className="grid grid-cols-[6rem_1fr_3.5rem] items-center gap-3 text-sm"><span>{row.date.slice(5)}</span><Bar value={row.page_views} max={maxima.daily} /><span className="text-right font-semibold">{row.page_views}</span></div>)}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Time of day</h2>
                <p className="mt-1 text-sm text-slate-500">Central Time</p>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {data.hourly.map((row) => <div key={row.hour}><div className="mb-1 flex justify-between text-xs text-slate-500"><span>{hourLabel(row.hour)}</span><span>{row.page_views}</span></div><Bar value={row.page_views} max={maxima.hourly} /></div>)}
                </div>
              </section>
            </div>
          </>
        )}
      </section>
    </PageLayoutWrapper>
  );
}
