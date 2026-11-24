"use client";

import "@/lib/chartjs-setup";
import type { ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import type { SiteStatisticsInsights, SiteStatisticsResponse } from "@/types/statistics";
import { BarList, bucketLabel, Card, DataTable, heat, num, pageLabel, pct, SectionHeading, Tile } from "./ui";

const OFFSETS = [["week_1", "1 week"], ["week_2", "2 weeks"], ["week_4", "4 weeks"], ["week_8", "8 weeks"]] as const;

/** Returning-visitor share over time, cohorts, visit frequency, stickiness
 *  and what new and returning visitors read. */
export function RetentionSection({ data, visitorDaily }: { data: SiteStatisticsInsights; visitorDaily: SiteStatisticsResponse["visitor_daily"] }) {
  const s = data.stickiness;
  const f = data.frequency;
  const shareData = {
    labels: visitorDaily.map((row) => bucketLabel(row.date)),
    datasets: [{
      label: "Returning visitors",
      data: visitorDaily.map((row) => (row.unique_visitors ? (row.returning_visitors / row.unique_visitors) * 100 : 0)),
      borderColor: "rgb(124, 58, 237)",
      backgroundColor: "rgba(124, 58, 237, 0.1)",
      pointRadius: 0,
      tension: 0.25,
    }],
  };
  const shareOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => `${Number(item.raw).toFixed(0)}% returning` } } },
    scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (value) => `${value}%` } }, x: { ticks: { maxTicksLimit: 10, maxRotation: 0 } } },
  };
  return <>
    <SectionHeading title="Retention and loyalty" description="Visitors are counted per browser (an id kept in local storage), so clearing site data or switching devices makes a new visitor." />
    <div className="flex flex-wrap gap-1">
      <Tile label="Average daily visitors" value={num(s.daily_visitors, 1)} sub="last 30 full days" />
      <Tile label="Stickiness (daily ÷ monthly)" value={pct(s.dau_mau)} sub={`${num(s.monthly_visitors)} visitors in 30 days`} />
      <Tile label="Daily ÷ weekly" value={pct(s.dau_wau)} sub={`${num(s.weekly_visitors)} visitors in 7 days`} />
      <Tile label="Visits per visitor" value={num(f.visits_per_visitor, 2)} sub="in the selected period" />
    </div>
    <div className="grid gap-2 lg:grid-cols-3">
      <Card title="Returning-visitor share by day" note="Share of each day's unique visitors first seen on an earlier day." className="lg:col-span-2">
        <div className="h-60 p-3"><Line data={shareData} options={shareOptions} aria-label="Returning-visitor share by day" role="img" /></div>
      </Card>
      <Card title="Visits per visitor" note="How many visits each visitor made in the period.">
        <BarList rows={[
          { label: "1 visit", value: f.visits_1 }, { label: "2–5 visits", value: f.visits_2_5 },
          { label: "6–20 visits", value: f.visits_6_20 }, { label: "21+ visits", value: f.visits_21_plus },
        ]} />
      </Card>
    </div>
    <Card title="Retention by first week" note="Visitors first seen in each week (from Monday), and the share seen again that many weeks later. Blank: that week hasn't finished.">
      <DataTable rows={[...data.cohorts].reverse()} rowKey={(row) => row.cohort} columns={[
        { label: "First week", render: (row) => bucketLabel(row.cohort) },
        { label: "New visitors", align: "right", render: (row) => num(row.visitors) },
        ...OFFSETS.map(([key, label]) => ({
          label: `After ${label}`,
          align: "right" as const,
          render: (row: SiteStatisticsInsights["cohorts"][number]) => (row[key] === null ? "" : <span className="inline-block min-w-12 rounded px-1" style={heat((row[key] ?? 0) * 2.5)}>{pct(row[key])}</span>),
        })),
      ]} />
    </Card>
    <div className="grid gap-2 lg:grid-cols-2">
      {(["new", "returning"] as const).map((kind) => <Card key={kind} title={kind === "new" ? "Top pages for new visitors" : "Top pages for returning visitors"} note={kind === "new" ? "Views on a visitor's first day: what brings people in." : "Views on later days: what keeps people coming back."}>
        <DataTable rows={data.visitor_type_pages[kind]} rowKey={(row) => row.path} columns={[
          { label: "Page", render: (row) => pageLabel(row.path), className: "max-w-64 truncate" },
          { label: "Views", align: "right", render: (row) => num(row.views) },
          { label: "Share", align: "right", render: (row) => pct(row.share) },
        ]} />
      </Card>)}
    </div>
  </>;
}
