"use client";

import "@/lib/chartjs-setup";
import { useMemo, useState } from "react";
import type { ChartOptions, Plugin } from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { STATISTICS_CALENDAR } from "@/config/statistics-calendar";
import type { PageChange, SiteStatisticsInsights } from "@/types/statistics";
import { bucketLabel, Card, Change, DataTable, heat, num, pageLabel, SectionHeading } from "./ui";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const hourName = (hour: number) => `${hour % 12 || 12}${hour < 12 ? "a" : "p"}`;
const toggleClass = (active: boolean) => `rounded-md px-2 py-0.5 text-xs font-semibold ${active ? "bg-cyan-700 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`;

type Marker = { index: number; label: string; color: string };

/** Dashed vertical lines with labels at the given x positions. */
const markerPlugin: Plugin<"line", { markers: Marker[] }> = {
  id: "statisticsMarkers",
  afterDatasetsDraw(chart, _args, options) {
    const { ctx, chartArea, scales } = chart;
    ctx.save();
    ctx.font = "10px sans-serif";
    options.markers.forEach((marker, order) => {
      const x = scales.x.getPixelForValue(marker.index);
      ctx.strokeStyle = marker.color;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.fillStyle = marker.color;
      ctx.fillText(marker.label, x + 3, chartArea.top + 10 + (order % 3) * 11);
    });
    ctx.restore();
  },
};

function MoversTable({ title, rows, kind }: { title: string; rows: PageChange[]; kind: "path" | "team" }) {
  return <Card title={title}>
    <DataTable maxHeight="max-h-64" rows={rows} rowKey={(row) => `${row[kind]}-${row.sport ?? ""}`} empty="No changes of 5+ views" columns={[
      { label: kind === "team" ? "Team" : "Page", render: (row) => kind === "team" ? row.team : pageLabel(row.path), className: "max-w-48 truncate" },
      { label: "Now", align: "right", render: (row) => num(row.current) },
      { label: "Before", align: "right", render: (row) => num(row.previous) },
      { label: "Change", align: "right", render: (row) => <Change value={row.change_pct} />, className: "whitespace-nowrap" },
    ]} />
  </Card>;
}

/** The four rising/falling tables. When tracking began partway through the
 *  previous period, "Before" undercounts and little can fall, so a note says
 *  so; with no earlier data at all, the note replaces the tables. */
export function Movers({ movers }: { movers: NonNullable<SiteStatisticsInsights["movers"]> }) {
  const tables = <div className="grid gap-2 md:grid-cols-2">
    <MoversTable title="Rising pages" rows={movers.pages.rising} kind="path" />
    <MoversTable title="Falling pages" rows={movers.pages.falling} kind="path" />
    <MoversTable title="Rising teams" rows={movers.teams.rising} kind="team" />
    <MoversTable title="Falling teams" rows={movers.teams.falling} kind="team" />
  </div>;
  if (movers.previous_complete !== false) return tables;
  const since = movers.tracking_since
    ? new Date(movers.tracking_since).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })
    : null;
  const began = since ? `Visit tracking began ${since}` : "Visit tracking began recently";
  const rows = [...movers.pages.rising, ...movers.pages.falling, ...movers.teams.rising, ...movers.teams.falling];
  if (rows.every((row) => row.previous === 0)) {
    return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      Rising and falling pages compare this period with the one before it. {began}, so there is no earlier period of this length to compare with yet. Choose a shorter period.
    </p>;
  }
  return <div className="space-y-2">
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      {began}, partway through the period these are compared with, so &ldquo;Before&rdquo; counts only part of it: rises look larger than they are and few pages can show as falling.
    </p>
    {tables}
  </div>;
}

/** Every day from the first to the last, with zeros for days without views. */
function continuousDays(rows: Array<{ date: string; views: number }>) {
  if (!rows.length) return [];
  const values = new Map(rows.map((row) => [row.date, row.views]));
  const days: Array<{ date: string; views: number }> = [];
  const end = new Date(`${rows[rows.length - 1].date}T00:00:00Z`);
  for (let day = new Date(`${rows[0].date}T00:00:00Z`); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const key = day.toISOString().slice(0, 10);
    days.push({ date: key, views: values.get(key) ?? 0 });
  }
  return days;
}

/** Rising and falling pages and teams, when people visit, the sports
 *  calendar, the content mix and conference interest by page. */
export function ContentSection({ data }: { data: SiteStatisticsInsights }) {
  const [mixView, setMixView] = useState<"sport" | "archive">("sport");
  const heatMax = Math.max(1, ...data.heatmap.map((cell) => cell.views));
  const heatCells = useMemo(() => new Map(data.heatmap.map((cell) => [`${cell.weekday}-${cell.hour}`, cell.views])), [data.heatmap]);
  const days = useMemo(() => continuousDays(data.daily_views), [data.daily_views]);
  const spikeDates = new Set(data.spikes.map((spike) => spike.date));
  const markers: Marker[] = [
    ...STATISTICS_CALENDAR.map((event) => ({ index: days.findIndex((day) => day.date === event.date), label: event.label, color: event.sport === "basketball" ? "rgb(217, 119, 6)" : "rgb(22, 101, 52)" })),
  ].filter((marker) => marker.index >= 0);
  const dailyData = {
    labels: days.map((day) => bucketLabel(day.date)),
    datasets: [{
      label: "Views",
      data: days.map((day) => day.views),
      borderColor: "rgb(8, 145, 178)",
      backgroundColor: "rgba(8, 145, 178, 0.12)",
      pointRadius: days.map((day) => (spikeDates.has(day.date) ? 5 : 0)),
      pointBackgroundColor: "rgb(190, 18, 60)",
      tension: 0.2,
    }],
  };
  const dailyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: false }, statisticsMarkers: { markers } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 10, maxRotation: 0 } } },
  } as ChartOptions<"line">;
  const mix = data.content_mix.buckets;
  const mixData = {
    labels: mix.map((row) => bucketLabel(row.bucket)),
    datasets: mixView === "sport"
      ? [
        { label: "Basketball", data: mix.map((row) => row.basketball), backgroundColor: "rgba(217, 119, 6, 0.75)" },
        { label: "Football", data: mix.map((row) => row.football), backgroundColor: "rgba(22, 101, 52, 0.7)" },
        { label: "Other pages", data: mix.map((row) => row.other), backgroundColor: "rgba(100, 116, 139, 0.6)" },
      ]
      : [
        { label: "Current season", data: mix.map((row) => row.total - row.archive), backgroundColor: "rgba(8, 145, 178, 0.75)" },
        { label: "Archive", data: mix.map((row) => row.archive), backgroundColor: "rgba(124, 58, 237, 0.6)" },
      ],
  };
  const mixOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { position: "bottom" } },
    scales: { x: { stacked: true, ticks: { maxTicksLimit: 12, maxRotation: 0 } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
  };
  const matrix = data.conference_pages;
  const matrixMax = Math.max(1, ...matrix.cells.flat());

  return <>
    <SectionHeading title="Content and the sports calendar" />
    {data.movers ? <Movers movers={data.movers} /> : <p className="text-sm text-slate-500">Rising and falling pages need a period to compare with; choose one other than All time.</p>}
    <Card title="Daily views and the sports calendar" note={<>Dashed lines mark season dates (<span className="text-amber-600">basketball</span>, <span className="text-green-800 dark:text-green-500">football</span>; edit <code>src/config/statistics-calendar.ts</code>). Red points are unusually busy days, explained below.</>}>
      <div className="h-72 p-3"><Line data={dailyData} options={dailyOptions} plugins={[markerPlugin as unknown as Plugin<"line">]} aria-label="Daily views with season dates" role="img" /></div>
      <DataTable maxHeight="max-h-56" rows={data.spikes} rowKey={(row) => row.date} empty="No unusually busy days in this period (more than two standard deviations above the average)" columns={[
        { label: "Busy day", render: (row) => bucketLabel(row.date) },
        { label: "Views", align: "right", render: (row) => num(row.views) },
        { label: "× average", align: "right", render: (row) => num(row.times_average, 1) },
        { label: "Top page", render: (row) => pageLabel(row.top_page), className: "max-w-48 truncate" },
        { label: "Top team", render: (row) => row.top_team ?? "–" },
        { label: "Top source", render: (row) => row.top_source ?? "–" },
      ]} />
    </Card>
    <div className="grid gap-2 lg:grid-cols-2">
      <Card title="When people visit" note="Views by day of week and hour, Central time.">
        <div className="overflow-x-auto p-3">
          <table className="w-full border-separate border-spacing-0.5 text-[10px]">
            <thead><tr><th />{HOURS.map((hour) => <th key={hour} scope="col" className="font-normal text-slate-400">{hour % 3 === 0 ? hourName(hour) : ""}</th>)}</tr></thead>
            <tbody>{WEEKDAYS.map((name, index) => <tr key={name}>
              <th scope="row" className="pr-1 text-left font-semibold text-slate-500">{name}</th>
              {HOURS.map((hour) => { const views = heatCells.get(`${index + 1}-${hour}`) ?? 0; return <td key={hour} title={`${name} ${hourName(hour)}: ${views.toLocaleString()} views`} className="h-5 min-w-4 rounded-sm" style={heat(views / heatMax)} />; })}
            </tr>)}</tbody>
          </table>
        </div>
      </Card>
      <Card title="Content mix over time" note={<span className="inline-flex gap-1">{([["sport", "By sport"], ["archive", "Current vs archive"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setMixView(value)} className={toggleClass(mixView === value)}>{label}</button>)}</span>}>
        <div className="h-64 p-3"><Bar data={mixData} options={mixOptions} aria-label="Content mix over time" role="img" /></div>
      </Card>
    </div>
    <div className="grid gap-2 lg:grid-cols-3">
      <Card title="Conference interest by page" note="Conference selections (page loads and filter changes) for the busiest pages and conferences." className="lg:col-span-2">
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th scope="col" className="px-2 py-1 text-left">Page</th>{matrix.conferences.map((conference) => <th key={conference} scope="col" className="whitespace-nowrap px-1 py-1 font-semibold">{conference}</th>)}</tr></thead>
            <tbody>{matrix.pages.map((page, row) => <tr key={page}>
              <th scope="row" className="whitespace-nowrap px-2 py-0.5 text-left font-semibold text-slate-600 dark:text-slate-300">{page}</th>
              {matrix.cells[row].map((value, column) => <td key={matrix.conferences[column]} className="px-1 py-0.5 text-center tabular-nums" style={heat(value / matrixMax)}>{value || ""}</td>)}
            </tr>)}</tbody>
          </table>
          {!matrix.pages.length && <p className="p-6 text-center text-xs text-slate-500">No data</p>}
        </div>
      </Card>
      <Card title="Conferences people choose" note="Selections excluding a page's default conference (Big 12). Counted from when defaults began to be flagged.">
        <DataTable rows={data.chosen_conferences} rowKey={(row) => row.conference} empty="No data yet: tracking starts with this release." columns={[
          { label: "Conference", render: (row) => row.conference },
          { label: "Chosen", align: "right", render: (row) => num(row.chosen) },
          { label: "Default", align: "right", render: (row) => num(row.defaulted) },
        ]} />
      </Card>
    </div>
    <Card title="Game-day lift" note="Average team-page views on the team's game days against its other days, for the most-viewed teams with a schedule. Team names must match the schedule tables.">
      <DataTable rows={data.game_day_lift} rowKey={(row) => `${row.sport}-${row.team}`} empty="No team pages with schedule matches in this period" columns={[
        { label: "Team", render: (row) => row.team },
        { label: "Sport", render: (row) => row.sport },
        { label: "Game days", align: "right", render: (row) => num(row.game_days) },
        { label: "Views on game days", align: "right", render: (row) => num(row.game_day_avg, 1) },
        { label: "Other days", align: "right", render: (row) => num(row.other_day_avg, 1) },
        { label: "Lift", align: "right", render: (row) => (row.lift === null ? "–" : `${num(row.lift, 2)}×`) },
      ]} />
    </Card>
  </>;
}
