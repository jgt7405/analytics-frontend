"use client";

import "@/lib/chartjs-setup";
import type { ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import type { SiteStatisticsInsights, SourceQualityRow } from "@/types/statistics";
import { Card, DataTable, duration, num, pct, SectionHeading } from "./ui";

const LINK_COLORS = ["rgb(8, 145, 178)", "rgb(217, 119, 6)", "rgb(124, 58, 237)", "rgb(22, 101, 52)", "rgb(190, 18, 60)"];

function QualityTable({ rows, kind }: { rows: SourceQualityRow[]; kind: "channel" | "source" }) {
  return <DataTable rows={rows} rowKey={(row) => row[kind] ?? ""} columns={[
    { label: kind === "channel" ? "Channel" : "Source", render: (row) => row[kind], className: "max-w-48 truncate" },
    { label: "Visits", align: "right", render: (row) => num(row.visits) },
    { label: "Bounce", align: "right", render: (row) => pct(row.bounce_rate) },
    { label: "Pages/visit", align: "right", render: (row) => num(row.pages_per_visit, 1) },
    { label: "Median length", align: "right", render: (row) => duration(row.median_seconds) },
    { label: "Came back", align: "right", render: (row) => pct(row.return_rate) },
  ]} />;
}

/** How good each source's visits are, and how long a shared link keeps
 *  sending people. */
export function SourcesSection({ data }: { data: SiteStatisticsInsights }) {
  const decay = data.referral_decay;
  const chartData = {
    labels: Array.from({ length: 48 }, (_, hour) => `${hour}h`),
    datasets: decay.map((link, index) => ({
      label: link.referrer_url,
      data: link.hours,
      borderColor: LINK_COLORS[index % LINK_COLORS.length],
      backgroundColor: "transparent",
      pointRadius: 0,
      tension: 0.25,
    })),
  };
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10 } } } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 9, maxRotation: 0 } } },
  };
  const note = "Visits that began from each source. Came back: the visitor returned on a later day within 30 days (recent visits haven't had 30 days yet).";
  return <>
    <SectionHeading title="Traffic quality" description="Which sources bring visitors who stay and return, not just clicks. Counted from when source tracking began." />
    <div className="grid gap-2 lg:grid-cols-2">
      <Card title="Quality by channel" note={note}><QualityTable rows={data.channel_quality} kind="channel" /></Card>
      <Card title="Quality by source" note={note}><QualityTable rows={data.source_quality} kind="source" /></Card>
    </div>
    <Card title="How long a shared link keeps sending visitors" note="Visits by hour after each of this period's top referring links first sent someone, over 48 hours.">
      {decay.length ? <>
        <div className="h-64 p-3"><Line data={chartData} options={options} aria-label="Visits by hour after a link was first used" role="img" /></div>
        <DataTable maxHeight="max-h-48" rows={decay} rowKey={(row) => row.referrer_url} columns={[
          { label: "Link", render: (row) => row.referrer_url, className: "max-w-72 truncate" },
          { label: "First visit", render: (row) => (row.first_visit ? new Date(row.first_visit).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "–") },
          { label: "Visits (48h)", align: "right", render: (row) => num(row.visits_48h) },
          { label: "In first 6h", align: "right", render: (row) => pct(row.share_first_6h) },
          { label: "In first 24h", align: "right", render: (row) => pct(row.share_first_24h) },
        ]} />
      </> : <p className="p-6 text-center text-xs text-slate-500">No referring links in this period</p>}
    </Card>
  </>;
}
