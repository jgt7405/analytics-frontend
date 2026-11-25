"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useCompareAnalysis } from "@/hooks/useCompareAnalysis";
import type { CompareAnalysisResponse } from "@/types/compare-analysis";

// Usage of the Compare Schedules page: which teams visitors add, which teams
// they compare with each other, and how big their comparisons get. Styled
// like WhatIfAnalysisDashboard.

type Sport = "basketball" | "football";

const PERIODS = [
  ["7", "7 days"], ["30", "30 days"], ["90", "90 days"],
  ["365", "1 year"], ["all", "All time"],
] as const;
const number = new Intl.NumberFormat("en-US");
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });
const panel = "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900";
const heading = "text-xl font-bold text-slate-700 dark:text-slate-200";
const note = "mt-1 text-xs text-slate-500 dark:text-slate-400";

function localDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value.replace(/([+-]\d{2})$/, "$1:00"));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(date);
}

function Bar({ value, max }: { value: number; max: number }) {
  return <div className="h-2.5 min-w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>;
}

function maxOf(values: number[]) {
  return Math.max(0, ...values);
}

function Dashboard({ data, sport }: { data: CompareAnalysisResponse; sport: Sport }) {
  const { summary } = data;
  const [teamSort, setTeamSort] = useState<"adds" | "first_picks" | "visitors">("adds");
  const teams = useMemo(
    () => [...data.teams].sort((a, b) => b[teamSort] - a[teamSort] || b.adds - a.adds || a.team.localeCompare(b.team)),
    [data.teams, teamSort],
  );
  const maxima = {
    teams: maxOf(teams.map((row) => row[teamSort])),
    pairs: maxOf(data.pairs.map((row) => row.times)),
    conferences: maxOf(data.conferences.map((row) => row.adds)),
    matchups: maxOf(data.conference_matchups.map((row) => row.times)),
    sizes: maxOf(data.sizes.map((row) => row.comparisons)),
    daily: maxOf(data.daily.map((row) => row.adds)),
  };
  const showRank = sport === "football";
  const usageRate = summary.page_views ? summary.comparisons / summary.page_views : null;

  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Card label="Comparisons" value={number.format(summary.comparisons)} detail={usageRate === null ? "Compare page views with a team added" : `${percent.format(Math.min(usageRate, 1))} of ${number.format(summary.page_views)} compare page views`} />
      <Card label="Teams added" value={number.format(summary.adds)} detail={showRank ? `${number.format(summary.hand_picks)} by hand · ${number.format(summary.rank_adds)} by rank quick-select` : `${number.format(summary.teams)} different teams`} />
      <Card label="Teams per comparison" value={summary.average_teams.toFixed(1)} detail={`${number.format(summary.multi_team_comparisons)} comparisons had 2+ teams`} />
      <Card label="Visitors" value={number.format(summary.visitors)} detail="Added at least one team" />
      <Card label="Same-conference pairs" value={summary.same_conference_pair_share === null ? "—" : percent.format(summary.same_conference_pair_share)} detail={`${number.format(summary.pairs)} different pairs compared`} />
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={heading}>Most-selected teams</h2>
            <p className={note}>First picks: times the team started a comparison.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">Rank by
            <select value={teamSort} onChange={(event) => setTeamSort(event.target.value as typeof teamSort)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
              <option value="adds">Times added</option>
              <option value="first_picks">First picks</option>
              <option value="visitors">Visitors</option>
            </select>
          </label>
        </div>
        <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-2">
          {teams.map((row, index) => <div key={row.team} title={`${row.team}: added ${row.adds} times (${row.hand_picks} by hand${showRank ? `, ${row.rank_adds} by rank quick-select` : ""}), first pick ${row.first_picks} times, ${row.visitors} visitors`} className="grid grid-cols-[1.5rem_minmax(7rem,11rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="text-right text-xs text-slate-400">{index + 1}</span>
            <div className="min-w-0"><p className="truncate font-medium">{row.team}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.conference || "Unknown conference"}</p></div>
            <Bar value={row[teamSort]} max={maxima.teams} />
            <span className="whitespace-nowrap text-right text-xs text-slate-500 dark:text-slate-400"><span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{row[teamSort]}</span>{teamSort !== "first_picks" && ` · ${row.first_picks} first`}</span>
          </div>)}
          {!teams.length && <Empty>No teams added in this period.</Empty>}
        </div>
      </section>

      <section className={panel}>
        <h2 className={heading}>Most-compared pairs</h2>
        <p className={note}>Counted when a team is hand-picked into a comparison that already has the other team.</p>
        <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-2">
          {data.pairs.map((row, index) => <div key={`${row.team_a}|${row.team_b}`} title={`${row.team_a} vs ${row.team_b}: ${row.times} times by ${row.visitors} visitors; last ${localDateTime(row.latest)}`} className="grid grid-cols-[1.5rem_minmax(9rem,15rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="text-right text-xs text-slate-400">{index + 1}</span>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.team_a} <span className="text-slate-400">vs</span> {row.team_b}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.same_conference ? `Both ${row.conference_a}` : `${row.conference_a ?? "?"} vs ${row.conference_b ?? "?"}`}</p>
            </div>
            <Bar value={row.times} max={maxima.pairs} />
            <span className="whitespace-nowrap text-right text-xs text-slate-500 dark:text-slate-400"><span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{row.times}</span> · {row.visitors} {row.visitors === 1 ? "visitor" : "visitors"}</span>
          </div>)}
          {!data.pairs.length && <Empty>No teams were compared side by side in this period.</Empty>}
        </div>
      </section>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className={panel}>
        <h2 className={heading}>Conferences</h2>
        <p className={note}>Teams added, by each team&apos;s current conference.</p>
        <div className="mt-5 max-h-96 space-y-3 overflow-y-auto pr-2">
          {data.conferences.map((row) => <div key={row.conference} title={`${row.conference}: ${row.adds} adds across ${row.teams} teams`} className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate font-medium">{row.conference}</span>
            <Bar value={row.adds} max={maxima.conferences} />
            <span className="whitespace-nowrap text-right text-xs text-slate-500 dark:text-slate-400"><span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{row.adds}</span> · {row.teams} teams</span>
          </div>)}
          {!data.conferences.length && <Empty>No teams added in this period.</Empty>}
        </div>
      </section>

      <section className={panel}>
        <h2 className={heading}>Conference matchups</h2>
        <p className={note}>Which conferences&apos; teams get compared with each other (from the pairs).</p>
        <div className="mt-5 max-h-96 space-y-3 overflow-y-auto pr-2">
          {data.conference_matchups.map((row) => <div key={`${row.conference_a}|${row.conference_b}`} title={`${row.conference_a} vs ${row.conference_b}: ${row.times} pairings, ${row.pairs} different pairs`} className="grid grid-cols-[minmax(8rem,14rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate font-medium">{row.conference_a === row.conference_b ? `${row.conference_a} (within)` : `${row.conference_a} vs ${row.conference_b}`}</span>
            <Bar value={row.times} max={maxima.matchups} />
            <span className="text-right text-sm font-semibold">{row.times}</span>
          </div>)}
          {!data.conference_matchups.length && <Empty>No pairs with known conferences in this period.</Empty>}
        </div>
      </section>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className={panel}>
        <h2 className={heading}>Comparison size</h2>
        <p className={note}>Most teams on screen together in each comparison.</p>
        <div className="mt-5 space-y-3">
          {data.sizes.map((row) => <div key={row.teams} title={`${row.comparisons} comparisons reached ${row.teams} ${row.teams === 1 ? "team" : "teams"}`} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-3 text-sm">
            <span>{row.teams} {row.teams === 1 ? "team" : "teams"}</span>
            <Bar value={row.comparisons} max={maxima.sizes} />
            <span className="text-right font-semibold">{row.comparisons}</span>
          </div>)}
          {!data.sizes.length && <Empty>No comparisons in this period.</Empty>}
        </div>
      </section>

      <section className={panel}>
        <h2 className={heading}>Teams added by day</h2>
        <div className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-2">
          {data.daily.slice(-30).reverse().map((row) => <div key={row.date} title={`${row.date}: ${row.adds} teams added in ${row.comparisons} comparisons`} className="grid grid-cols-[4rem_1fr_auto] items-center gap-3 text-sm">
            <span>{row.date.slice(5)}</span>
            <Bar value={row.adds} max={maxima.daily} />
            <span className="whitespace-nowrap text-right text-xs text-slate-500 dark:text-slate-400"><span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{row.adds}</span> · {row.comparisons} comp.</span>
          </div>)}
          {!data.daily.length && <Empty>No activity in this period.</Empty>}
        </div>
      </section>
    </div>

    {data.sets.length > 0 && <section className={panel}>
      <h2 className={heading}>Repeated team sets</h2>
      <p className={note}>The exact same group of teams compared more than once.</p>
      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {data.sets.map((row) => <li key={row.teams.join("|")} className="flex items-center justify-between gap-4 py-2 text-sm">
          <span>{row.teams.join(", ")}</span>
          <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400"><span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{row.times}</span> times · {row.visitors} {row.visitors === 1 ? "visitor" : "visitors"}</span>
        </li>)}
      </ul>
    </section>}

    <section className={`${panel} p-0`}>
      <div className="p-5"><h2 className={heading}>Recent comparisons</h2><p className={note}>Teams in the order they were selected.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800/70"><tr><th className="px-5 py-3">When</th><th className="px-5 py-3">Teams</th><th className="px-5 py-3">Count</th><th className="px-5 py-3">Season</th></tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.recent.map((row, index) => <tr key={`${row.occurred_at}-${index}`}><td className="whitespace-nowrap px-5 py-3">{localDateTime(row.occurred_at)}</td><td className="px-5 py-3">{row.teams.join(", ")}</td><td className="px-5 py-3">{row.size}</td><td className="px-5 py-3">{row.season ?? "Current"}</td></tr>)}
          {!data.recent.length && <tr><td colSpan={4} className="px-5 py-4 text-slate-500">No comparisons in this period.</td></tr>}
        </tbody>
      </table></div>
    </section>
  </>;
}

export default function CompareAnalysisDashboard({ sport }: { sport: Sport }) {
  const [period, setPeriod] = useState("30");
  const { data, isLoading, error } = useCompareAnalysis(sport, period);
  const label = sport === "basketball" ? "Basketball" : "Football";

  return <PageLayoutWrapper title={`${label} Compare Analytics`} isLoading={isLoading} hideTitle>
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Usage dashboard</p>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.035em] text-slate-800 dark:text-slate-100">{label} Compare Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Which teams visitors put on the <Link href={`/${sport}/compare/`} className="font-medium text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-400">Compare Schedules</Link> page, and which teams they compare with each other.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">Date range
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            {PERIODS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </label>
      </div>

      {isLoading && <TableSkeleton rows={8} cols={5} />}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">Unable to load compare analytics. Please try again shortly.</div>}
      {data && !data.tracking_since && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Compare tracking is ready, but no {sport} teams have been added on the compare page yet. Numbers appear here once visitors start comparing teams.</div>}
      {data?.tracking_since && <>
        <p className="text-xs text-slate-500 dark:text-slate-400">Tracking since {localDateTime(data.tracking_since)} · latest activity {localDateTime(data.summary.latest_event)} (Central Time). Bots are excluded.</p>
        <Dashboard data={data} sport={sport} />
      </>}
    </section>
  </PageLayoutWrapper>;
}
